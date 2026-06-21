<?php

namespace App\Entity;

use App\Repository\OrderItemRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: OrderItemRepository::class)]
class OrderItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false)]
    private ?CustomerOrder $customerOrder = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Product $product = null;

    #[ORM\Column(length: 255)]
    private ?string $productNameSnapshot = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $caliberSnapshot = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $qualitySnapshot = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $formatSnapshot = null;

    #[ORM\Column]
    private ?int $quantity = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $unitPrice = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $lineTotal = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->quantity = 1;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCustomerOrder(): ?CustomerOrder
    {
        return $this->customerOrder;
    }

    public function setCustomerOrder(?CustomerOrder $customerOrder): static
    {
        $this->customerOrder = $customerOrder;

        return $this;
    }

    public function getProduct(): ?Product
    {
        return $this->product;
    }

    public function setProduct(?Product $product): static
    {
        $this->product = $product;

        return $this;
    }

    public function getProductNameSnapshot(): ?string
    {
        return $this->productNameSnapshot;
    }

    public function setProductNameSnapshot(string $productNameSnapshot): static
    {
        $this->productNameSnapshot = $productNameSnapshot;

        return $this;
    }

    public function getCaliberSnapshot(): ?string
    {
        return $this->caliberSnapshot;
    }

    public function setCaliberSnapshot(?string $caliberSnapshot): static
    {
        $this->caliberSnapshot = $caliberSnapshot;

        return $this;
    }

    public function getQualitySnapshot(): ?string
    {
        return $this->qualitySnapshot;
    }

    public function setQualitySnapshot(?string $qualitySnapshot): static
    {
        $this->qualitySnapshot = $qualitySnapshot;

        return $this;
    }

    public function getFormatSnapshot(): ?string
    {
        return $this->formatSnapshot;
    }

    public function setFormatSnapshot(?string $formatSnapshot): static
    {
        $this->formatSnapshot = $formatSnapshot;

        return $this;
    }

    public function getQuantity(): ?int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): static
    {
        $this->quantity = $quantity;

        return $this;
    }

    public function getUnitPrice(): ?float
    {
        return $this->unitPrice !== null ? (float) $this->unitPrice : null;
    }

    public function setUnitPrice(?float $unitPrice): static
    {
        $this->unitPrice = $unitPrice !== null ? (string) $unitPrice : null;

        return $this;
    }

    public function getLineTotal(): ?float
    {
        return $this->lineTotal !== null ? (float) $this->lineTotal : null;
    }

    public function setLineTotal(?float $lineTotal): static
    {
        $this->lineTotal = $lineTotal !== null ? (string) $lineTotal : null;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }
}
