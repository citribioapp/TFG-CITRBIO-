<?php

namespace App\Entity;

use App\Repository\CustomerOrderRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CustomerOrderRepository::class)]
class CustomerOrder
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'orders')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(length: 30)]
    private string $status = 'under_review';

    #[ORM\Column(length: 255)]
    private string $deliveryAddressSnapshot;

    /**
     * @var Collection<int, OrderItem>
     */
    #[ORM\OneToMany(mappedBy: 'customerOrder', targetEntity: OrderItem::class, orphanRemoval: true)]
    private Collection $items;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $shippingPrice = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $productsSubtotal = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $totalPrice = null;

    #[ORM\Column(length: 64, nullable: true, unique: true)]
    private ?string $paymentToken = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $paymentProofFilename = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $paymentProofUploadedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $paymentNoticeSentAt = null;

    public function __construct()
    {
        $this->items = new ArrayCollection();
        $this->status = 'under_review';
        $this->deliveryAddressSnapshot = '';
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getDeliveryAddressSnapshot(): string
    {
        return $this->deliveryAddressSnapshot;
    }

    public function setDeliveryAddressSnapshot(string $deliveryAddressSnapshot): static
    {
        $this->deliveryAddressSnapshot = trim($deliveryAddressSnapshot);

        return $this;
    }

    /**
     * @return Collection<int, OrderItem>
     */
    public function getItems(): Collection
    {
        return $this->items;
    }

    public function addItem(OrderItem $item): static
    {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setCustomerOrder($this);
        }

        return $this;
    }

    public function removeItem(OrderItem $item): static
    {
        if ($this->items->removeElement($item)) {
            if ($item->getCustomerOrder() === $this) {
                $item->setCustomerOrder(null);
            }
        }

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }

    public function getShippingPrice(): ?float
    {
        return $this->shippingPrice !== null ? (float) $this->shippingPrice : null;
    }

    public function setShippingPrice(?float $shippingPrice): static
    {
        $this->shippingPrice = $shippingPrice !== null ? (string) $shippingPrice : null;
        return $this;
    }

    public function getProductsSubtotal(): ?float
    {
        return $this->productsSubtotal !== null ? (float) $this->productsSubtotal : null;
    }

    public function setProductsSubtotal(?float $productsSubtotal): static
    {
        $this->productsSubtotal = $productsSubtotal !== null ? (string) $productsSubtotal : null;
        return $this;
    }

    public function getTotalPrice(): ?float
    {
        return $this->totalPrice !== null ? (float) $this->totalPrice : null;
    }

    public function setTotalPrice(?float $totalPrice): static
    {
        $this->totalPrice = $totalPrice !== null ? (string) $totalPrice : null;
        return $this;
    }

    public function getPaymentToken(): ?string
    {
        return $this->paymentToken;
    }

    public function setPaymentToken(?string $paymentToken): static
    {
        $this->paymentToken = $paymentToken;
        return $this;
    }

    /** Generate and store a cryptographically secure payment token if not already set. */
    public function ensurePaymentToken(): string
    {
        if ($this->paymentToken === null) {
            $this->paymentToken = bin2hex(random_bytes(32));
        }
        return $this->paymentToken;
    }

    public function getPaymentProofFilename(): ?string
    {
        return $this->paymentProofFilename;
    }

    public function setPaymentProofFilename(?string $paymentProofFilename): static
    {
        $this->paymentProofFilename = $paymentProofFilename;
        return $this;
    }

    public function getPaymentProofUploadedAt(): ?\DateTimeImmutable
    {
        return $this->paymentProofUploadedAt;
    }

    public function setPaymentProofUploadedAt(?\DateTimeImmutable $paymentProofUploadedAt): static
    {
        $this->paymentProofUploadedAt = $paymentProofUploadedAt;
        return $this;
    }

    public function getPaymentNoticeSentAt(): ?\DateTimeImmutable
    {
        return $this->paymentNoticeSentAt;
    }

    public function setPaymentNoticeSentAt(?\DateTimeImmutable $paymentNoticeSentAt): static
    {
        $this->paymentNoticeSentAt = $paymentNoticeSentAt;
        return $this;
    }
}
