import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AlignSeatBasedOrders1746691300000 implements MigrationInterface {
  name = 'AlignSeatBasedOrders1746691300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const ordersTable = await queryRunner.getTable('orders');

    if (!ordersTable) {
      return;
    }

    const seatIdColumn = ordersTable.findColumnByName('seatId');

    if (!seatIdColumn) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'seatId',
          type: 'varchar',
          length: '32',
          isNullable: true,
        }),
      );

      await queryRunner.query(
        `UPDATE "orders" SET "seatId" = CONCAT('legacy-seat-', "id") WHERE "seatId" IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "orders" ALTER COLUMN "seatId" SET NOT NULL`,
      );
    }

    const hasSeatIndex = ordersTable.indices.some(
      (index) => index.name === 'IDX_ORDERS_RESERVATION_SEAT',
    );

    if (!hasSeatIndex) {
      await queryRunner.createIndex(
        'orders',
        new TableIndex({
          name: 'IDX_ORDERS_RESERVATION_SEAT',
          columnNames: ['seatReservationId', 'seatId'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ordersTable = await queryRunner.getTable('orders');

    if (!ordersTable) {
      return;
    }

    const hasSeatIndex = ordersTable.indices.some(
      (index) => index.name === 'IDX_ORDERS_RESERVATION_SEAT',
    );

    if (hasSeatIndex) {
      await queryRunner.dropIndex('orders', 'IDX_ORDERS_RESERVATION_SEAT');
    }

    const seatIdColumn = ordersTable.findColumnByName('seatId');

    if (seatIdColumn) {
      await queryRunner.dropColumn('orders', 'seatId');
    }
  }
}
