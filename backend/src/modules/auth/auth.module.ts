import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        const refreshSecret = config.get<string>('JWT_REFRESH_SECRET');
        const isProd = config.get('NODE_ENV') === 'production';

        if (isProd && (!secret || secret === 'fallback_secret')) {
          throw new Error(
            'FATAL: JWT_SECRET environment variable is required in production. ' +
            'Generate a strong random secret (e.g., openssl rand -base64 64).',
          );
        }
        if (isProd && (!refreshSecret || refreshSecret === 'refresh_secret')) {
          throw new Error(
            'FATAL: JWT_REFRESH_SECRET environment variable is required in production. ' +
            'Generate a strong random secret different from JWT_SECRET.',
          );
        }

        if (!isProd && (!secret || secret === 'fallback_secret')) {
          new Logger('AuthModule').warn(
            '⚠️  Using fallback JWT_SECRET — set JWT_SECRET env var before deploying to production!',
          );
        }

        return {
          secret: secret || 'fallback_secret_dev_only',
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
