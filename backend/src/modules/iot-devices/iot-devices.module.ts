import { Module } from '@nestjs/common';
import { IotDevicesService } from './iot-devices.service';
import { IotDevicesController } from './iot-devices.controller';

@Module({ controllers: [IotDevicesController], providers: [IotDevicesService], exports: [IotDevicesService] })
export class IotDevicesModule {}
