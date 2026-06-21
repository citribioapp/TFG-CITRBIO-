<?php

namespace App\Tests\Repository;

use App\Entity\Product;
use App\Repository\ProductRepository;
use PHPUnit\Framework\TestCase;

class ProductRepositoryTest extends TestCase
{
    public function testProductRepositoryExists(): void
    {
        $this->assertTrue(
            class_exists(ProductRepository::class),
            'ProductRepository class should exist'
        );
    }

    public function testProductEntityHasRequiredMethods(): void
    {
        $product = new Product();

        $this->assertTrue(method_exists($product, 'getName'));
        $this->assertTrue(method_exists($product, 'setName'));
        $this->assertTrue(method_exists($product, 'getDescription'));
        $this->assertTrue(method_exists($product, 'setDescription'));
        $this->assertTrue(method_exists($product, 'isActive'));
        $this->assertTrue(method_exists($product, 'setIsActive'));
        $this->assertTrue(method_exists($product, 'getCategory'));
        $this->assertTrue(method_exists($product, 'setCategory'));
    }

    public function testProductDefaultValues(): void
    {
        $product = new Product();

        $this->assertTrue($product->isActive(), 'Product should be active by default');
        $this->assertInstanceOf(\DateTimeImmutable::class, $product->getCreatedAt());
    }
}
