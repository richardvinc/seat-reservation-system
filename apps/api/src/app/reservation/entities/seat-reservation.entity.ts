import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'seat_reservation' })
export class SeatReservationEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'int' })
  totalStock!: number;

  @Column({ type: 'timestamp' })
  startAt!: Date;

  @Column({ type: 'timestamp' })
  endAt!: Date;
}
