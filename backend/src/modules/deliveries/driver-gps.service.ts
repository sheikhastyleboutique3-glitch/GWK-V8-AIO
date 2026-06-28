import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Driver GPS Tracking — Records and retrieves driver locations for delivery ETA.
 *
 * Drivers send their GPS position periodically (every 15-30s via mobile app).
 * Managers and customers can see the last known position + ETA.
 */
@Injectable()
export class DriverGpsService {
  constructor(private prisma: PrismaService) {}

  /** Record a new GPS position from a driver's device. */
  async recordLocation(data: {
    driverId: number;
    deliveryId?: number;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }) {
    return this.prisma.driverLocation.create({ data });
  }

  /** Get the latest position for a driver. */
  async getLatest(driverId: number) {
    return this.prisma.driverLocation.findFirst({
      where: { driverId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /** Get the latest position for a specific delivery. */
  async getDeliveryLocation(deliveryId: number) {
    return this.prisma.driverLocation.findFirst({
      where: { deliveryId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /** Get the GPS trail for a delivery (for map replay). */
  async getTrail(deliveryId: number, limit = 100) {
    return this.prisma.driverLocation.findMany({
      where: { deliveryId },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    });
  }

  /** Get all active driver positions (for dispatch map view). */
  async getAllActive() {
    // Get the latest position for each driver who reported in the last 30 minutes
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const latest = await this.prisma.$queryRaw<
      Array<{ driverId: number; latitude: number; longitude: number; heading: number; speed: number; recordedAt: Date }>
    >`
      SELECT DISTINCT ON ("driverId")
        "driverId", latitude, longitude, heading, speed, "recordedAt"
      FROM driver_locations
      WHERE "recordedAt" > ${cutoff}
      ORDER BY "driverId", "recordedAt" DESC
    `;
    return latest;
  }

  /**
   * Estimate delivery time remaining (simple straight-line distance formula).
   * In production, use a routing API (Google Maps, Mapbox, HERE) for accuracy.
   */
  async estimateEta(deliveryId: number, destLat: number, destLng: number): Promise<{ distanceKm: number; etaMinutes: number } | null> {
    const loc = await this.getDeliveryLocation(deliveryId);
    if (!loc) return null;

    // Haversine distance
    const R = 6371; // Earth radius km
    const dLat = (destLat - loc.latitude) * Math.PI / 180;
    const dLng = (destLng - loc.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(loc.latitude * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Assume avg 30 km/h in city traffic (or use actual speed if available)
    const avgSpeed = (loc.speed && loc.speed > 5) ? loc.speed : 30;
    const etaMinutes = Math.round((distanceKm / avgSpeed) * 60);

    return { distanceKm: Math.round(distanceKm * 10) / 10, etaMinutes };
  }
}
