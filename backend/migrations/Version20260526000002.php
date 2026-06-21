<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260526000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add payment proof tracking fields to customer_order (idempotent)';
    }

    public function up(Schema $schema): void
    {
        $sm      = $this->connection->createSchemaManager();
        $columns = $sm->listTableColumns('customer_order');

        if (!array_key_exists('payment_proof_filename', $columns)) {
            $this->addSql('ALTER TABLE customer_order ADD payment_proof_filename VARCHAR(255) DEFAULT NULL');
        }

        if (!array_key_exists('payment_proof_uploaded_at', $columns)) {
            $this->addSql('ALTER TABLE customer_order ADD payment_proof_uploaded_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        }

        if (!array_key_exists('payment_notice_sent_at', $columns)) {
            $this->addSql('ALTER TABLE customer_order ADD payment_notice_sent_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        }
    }

    public function down(Schema $schema): void
    {
        $sm      = $this->connection->createSchemaManager();
        $columns = $sm->listTableColumns('customer_order');

        if (array_key_exists('payment_proof_filename', $columns)) {
            $this->addSql('ALTER TABLE customer_order DROP COLUMN payment_proof_filename');
        }

        if (array_key_exists('payment_proof_uploaded_at', $columns)) {
            $this->addSql('ALTER TABLE customer_order DROP COLUMN payment_proof_uploaded_at');
        }

        if (array_key_exists('payment_notice_sent_at', $columns)) {
            $this->addSql('ALTER TABLE customer_order DROP COLUMN payment_notice_sent_at');
        }
    }
}
