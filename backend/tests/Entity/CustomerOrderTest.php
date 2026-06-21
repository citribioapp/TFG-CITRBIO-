<?php

namespace App\Tests\Entity;

use App\Entity\CustomerOrder;
use App\Entity\OrderItem;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class CustomerOrderTest extends TestCase
{
    public function testOrderCreationWithDefaultValues(): void
    {
        $order = new CustomerOrder();

        // New orders start as under_review so the distributor can validate them before confirming
        $this->assertEquals('under_review', $order->getStatus());
        $this->assertInstanceOf(\DateTimeImmutable::class, $order->getCreatedAt());
        $this->assertInstanceOf(\DateTimeImmutable::class, $order->getUpdatedAt());
        $this->assertCount(0, $order->getItems());
    }

    public function testSetAndGetStatus(): void
    {
        $order = new CustomerOrder();
        $order->setStatus('processing');

        $this->assertEquals('processing', $order->getStatus());
    }

    public function testSetAndGetDeliveryAddress(): void
    {
        $order = new CustomerOrder();
        $order->setDeliveryAddressSnapshot('  Calle Mayor 1, Madrid  ');

        $this->assertEquals('Calle Mayor 1, Madrid', $order->getDeliveryAddressSnapshot());
    }

    public function testAddOrderItem(): void
    {
        $order = new CustomerOrder();
        $item = new OrderItem();

        $order->addItem($item);

        $this->assertCount(1, $order->getItems());
        $this->assertSame($order, $item->getCustomerOrder());
    }

    public function testRemoveOrderItem(): void
    {
        $order = new CustomerOrder();
        $item = new OrderItem();

        $order->addItem($item);
        $this->assertCount(1, $order->getItems());

        $order->removeItem($item);
        $this->assertCount(0, $order->getItems());
    }

    public function testSetUser(): void
    {
        $order = new CustomerOrder();
        $user = new User();

        $order->setUser($user);

        $this->assertSame($user, $order->getUser());
    }

    public function testAllowedStatuses(): void
    {
        $order = new CustomerOrder();
        $allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

        foreach ($allowedStatuses as $status) {
            $order->setStatus($status);
            $this->assertEquals($status, $order->getStatus());
        }
    }
}
