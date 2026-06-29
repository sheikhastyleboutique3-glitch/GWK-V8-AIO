import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { KdsService } from './kds.service';
import { KdsController } from './kds.controller';
import { KdsGateway } from './kds.gateway';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  controllers: [KdsController],
  providers: [KdsService, KdsGateway],
  exports: [KdsService],
})
export class KdsModule {}
