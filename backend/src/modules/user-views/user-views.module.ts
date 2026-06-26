import { Module } from '@nestjs/common';
import { UserViewsController } from './user-views.controller';
import { UserViewsService } from './user-views.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserViewsController],
  providers: [UserViewsService],
})
export class UserViewsModule {}
