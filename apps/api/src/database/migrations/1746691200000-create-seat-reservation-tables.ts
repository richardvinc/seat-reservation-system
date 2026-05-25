import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSeatReservationTables1746691200000 implements MigrationInterface {
  name = 'CreateSeatReservationTables1746691200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'seat_reservation',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '32',
            isPrimary: true,
          },
          {
            name: 'productName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'totalStock',
            type: 'int',
          },
          {
            name: 'startAt',
            type: 'timestamptz',
          },
          {
            name: 'endAt',
            type: 'timestamptz',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'seatReservationId',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'seatId',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'reservationId',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['paid'],
          },
          {
            name: 'paymentReferenceNumber',
            type: 'varchar',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['seatReservationId'],
        referencedTableName: 'seat_reservation',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_RESERVATION_USERNAME',
        columnNames: ['seatReservationId', 'username'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDERS_RESERVATION_SEAT',
        columnNames: ['seatReservationId', 'seatId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('orders', 'IDX_ORDERS_RESERVATION_SEAT');
    await queryRunner.dropIndex('orders', 'IDX_ORDERS_RESERVATION_USERNAME');

    const ordersTable = await queryRunner.getTable('orders');
    const reservationForeignKey = ordersTable?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('seatReservationId'),
    );

    if (reservationForeignKey) {
      await queryRunner.dropForeignKey('orders', reservationForeignKey);
    }

    await queryRunner.dropTable('orders');
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.dropTable('seat_reservation');
  }
}
