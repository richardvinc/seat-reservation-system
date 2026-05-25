import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SeatReservationEntity } from '../../reservation/entities/seat-reservation.entity';

export enum OrderStatus {
  PAID = 'paid',
}

@Entity({ name: 'orders' })
@Index('IDX_ORDERS_RESERVATION_USERNAME', ['seatReservationId', 'username'], {
  unique: true,
})
@Index('IDX_ORDERS_RESERVATION_SEAT', ['seatReservationId', 'seatId'], {
  unique: true,
})
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  seatReservationId!: string;

  @ManyToOne(() => SeatReservationEntity, { nullable: false })
  @JoinColumn({ name: 'seatReservationId', referencedColumnName: 'id' })
  sale!: SeatReservationEntity;

  @Column({ type: 'varchar', length: 50 })
  username!: string;

  @Column({ type: 'varchar', length: 32 })
  seatId!: string;

  @Column({ type: 'varchar', length: 64 })
  reservationId!: string;

  @Column({ type: 'enum', enum: OrderStatus })
  status!: OrderStatus;

  @Column({ type: 'varchar' })
  paymentReferenceNumber!: string;
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
