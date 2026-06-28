import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        branch: { select: { id: true, name: true, nameAr: true } },
        userBranches: {
          include: { branch: { select: { id: true, name: true, nameAr: true } } },
        },
      },
    });
    if (!user || !user.isActive) {
      this.logger.warn(`Failed login attempt: email="${email}" ip=${ip || 'unknown'} reason=user_not_found`);
      this.recordFailedLogin(email, ip, 'user_not_found');
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      this.logger.warn(`Failed login attempt: email="${email}" userId=${user.id} ip=${ip || 'unknown'} reason=wrong_password`);
      this.recordFailedLogin(email, ip, 'wrong_password');
      throw new UnauthorizedException('Invalid credentials');
    }
    // Onboarding gate: credentials are correct but the account isn't approved yet.
    if (!user.isApproved) {
      this.logger.warn(`Blocked login: email="${email}" userId=${user.id} ip=${ip || 'unknown'} reason=not_approved`);
      throw new UnauthorizedException('Your account is pending approval by a manager.');
    }

    // Clear failed login count on successful auth
    this.logger.log(`Successful login: email="${email}" userId=${user.id} role=${user.role}`);

    const branchIds = user.userBranches.map((ub) => ub.branchId);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchIds: branchIds.length > 0 ? branchIds : (user.branchId ? [user.branchId] : []),
    };
    const accessToken = this.jwt.sign(payload);
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') || 'refresh_secret_dev_only';
    const refreshToken = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const { password: _, ...safeUser } = user;
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        ...safeUser,
        assignedBranches: user.userBranches.map((ub) => ({
          id: ub.branch.id,
          name: ub.branch.name,
          nameAr: ub.branch.nameAr,
          isPrimary: ub.isPrimary,
        })),
      },
    };
  }

  /**
   * Fast cashier switch (Odoo employee badge/PIN login). Given a branch and a
   * numeric PIN, find the matching approved staff member for that branch and
   * issue the same JWT pair as a normal login — no email/password needed at the
   * terminal. PINs are matched within a branch scope to keep them short.
   */
  async pinLogin(pin: string, branchId?: number) {
    if (!pin) throw new UnauthorizedException('PIN required');
    const candidates = await this.prisma.user.findMany({
      where: {
        posPin: pin,
        isActive: true,
        isApproved: true,
        ...(branchId ? { OR: [{ branchId }, { userBranches: { some: { branchId } } }] } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, nameAr: true } },
        userBranches: { include: { branch: { select: { id: true, name: true, nameAr: true } } } },
      },
    });
    if (candidates.length !== 1) {
      // 0 = wrong PIN; >1 = ambiguous (PINs must be unique within the branch).
      throw new UnauthorizedException('Invalid or ambiguous PIN');
    }
    const user = candidates[0];
    const branchIds = user.userBranches.map((ub) => ub.branchId);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchIds: branchIds.length > 0 ? branchIds : user.branchId ? [user.branchId] : [],
    };
    const accessToken = this.jwt.sign(payload);
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') || 'refresh_secret_dev_only';
    const refreshToken = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    const { password: _, ...safeUser } = user;
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        ...safeUser,
        assignedBranches: user.userBranches.map((ub) => ({ id: ub.branch.id, name: ub.branch.name, nameAr: ub.branch.nameAr, isPrimary: ub.isPrimary })),
      },
    };
  }

  /**
   * PIN Verify — confirms a manager/admin PIN for single-action override.
   * Does NOT create a session/token. Returns authorized + user info only.
   */
  async pinVerify(pin: string) {
    if (!pin) throw new UnauthorizedException('PIN required');
    const user = await this.prisma.user.findFirst({
      where: { posPin: pin, isActive: true, role: { in: ['SUPER_ADMIN', 'BRANCH_MANAGER'] } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Invalid manager PIN');
    return { authorized: true, user };
  }

  async refreshToken(token: string) {
    try {
      const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') || 'refresh_secret_dev_only';
      const payload = this.jwt.verify(token, {
        secret: refreshSecret,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { userBranches: { select: { branchId: true } } },
      });
      if (!user || !user.isActive) throw new UnauthorizedException();
      const branchIds = user.userBranches.map((ub) => ub.branchId);
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchIds: branchIds.length > 0 ? branchIds : (user.branchId ? [user.branchId] : []),
      };
      return { access_token: this.jwt.sign(newPayload) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: { select: { id: true, name: true, nameAr: true } },
        userBranches: {
          include: { branch: { select: { id: true, name: true, nameAr: true } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    const { password: _, ...safeUser } = user;
    return {
      ...safeUser,
      assignedBranches: user.userBranches.map((ub) => ({
        id: ub.branch.id,
        name: ub.branch.name,
        nameAr: ub.branch.nameAr,
        isPrimary: ub.isPrimary,
      })),
    };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return { message: 'Password changed successfully' };
  }

  async switchBranch(userId: number, branchId: number) {
    const assignment = await this.prisma.userBranch.findUnique({
      where: { userId_branchId: { userId, branchId } },
    });
    if (!assignment) {
      // Super admins can switch to any branch
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'SUPER_ADMIN') {
        throw new BadRequestException('You are not assigned to this branch');
      }
    }
    await this.prisma.user.update({ where: { id: userId }, data: { branchId } });
    return this.getProfile(userId);
  }

  /**
   * Record failed login attempt for security auditing.
   * Fire-and-forget — never blocks the auth flow.
   */
  private recordFailedLogin(email: string, ip?: string, reason?: string): void {
    this.prisma.auditLog.create({
      data: {
        userId: null as any,
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: email,
        newValues: { email, ip: ip || 'unknown', reason: reason || 'unknown', at: new Date().toISOString() },
      },
    }).catch(() => { /* audit is best-effort */ });
  }
}
