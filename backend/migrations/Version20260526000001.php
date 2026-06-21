<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260526000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add payment_token to customer_order for secure no-login payment confirmation link (idempotent)';
    }

    public function up(Schema $schema): void
    {
        $sm      = $this->connection->createSchemaManager();
        $columns = $sm->listTableColumns('customer_order');
        $indexes = $sm->listTableIndexes('customer_order');

        // Add column only if it does not already exist
        if (!array_key_exists('payment_token', $columns)) {
            $this->addSql('ALTER TABLE customer_order ADD payment_token VARCHAR(64) DEFAULT NULL');
        }

        // Add unique index only if no index on payment_token already exists
        $indexExists = false;
        foreach ($indexes as $index) {
            if (in_array('payment_token', $index->getColumns(), true)) {
                $indexExists = true;
                break;
            }
        }

        if (!$indexExists) {
            $this->addSql('CREATE UNIQUE INDEX UNIQ_3B1CE6A387E978 ON customer_order (payment_token)');
        }
    }

    public function down(Schema $schema): void
    {
        $sm      = $this->connection->createSchemaManager();
        $columns = $sm->listTableColumns('customer_order');
        $indexes = $sm->listTableIndexes('customer_order');

        // Drop index only if it exists
        foreach ($indexes as $name => $index) {
            if (in_array('payment_token', $index->getColumns(), true)) {
                $this->addSql('DROP INDEX ' . $name . ' ON customer_order');
                break;
            }
        }

        // Drop column only if it exists
        if (array_key_exists('payment_token', $columns)) {
            $this->addSql('ALTER TABLE customer_order DROP COLUMN payment_token');
        }
    }
}
