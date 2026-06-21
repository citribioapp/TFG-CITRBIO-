<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260508000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add pricing fields: unit_price + line_total to order_item; shipping_price, products_subtotal, total_price to customer_order';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE order_item ADD unit_price NUMERIC(10, 2) DEFAULT NULL, ADD line_total NUMERIC(10, 2) DEFAULT NULL');
        $this->addSql('ALTER TABLE customer_order ADD shipping_price NUMERIC(10, 2) DEFAULT NULL, ADD products_subtotal NUMERIC(10, 2) DEFAULT NULL, ADD total_price NUMERIC(10, 2) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE order_item DROP COLUMN unit_price, DROP COLUMN line_total');
        $this->addSql('ALTER TABLE customer_order DROP COLUMN shipping_price, DROP COLUMN products_subtotal, DROP COLUMN total_price');
    }
}
