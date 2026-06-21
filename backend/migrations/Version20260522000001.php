<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260522000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add is_out_of_season boolean field to product table (default false)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD is_out_of_season TINYINT(1) NOT NULL DEFAULT 0');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP COLUMN is_out_of_season');
    }
}
