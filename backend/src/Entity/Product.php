<?php

namespace App\Entity;

use App\Repository\ProductRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProductRepository::class)]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(options: ['default' => false])]
    private bool $isOutOfSeason = false;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\ManyToOne(inversedBy: 'products')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Category $category = null;

    /**
     * @var Collection<int, Caliber>
     */
    #[ORM\OneToMany(mappedBy: 'product', targetEntity: Caliber::class, orphanRemoval: true)]
    private Collection $calibers;

    /**
     * @var Collection<int, Quality>
     */
    #[ORM\OneToMany(mappedBy: 'product', targetEntity: Quality::class, orphanRemoval: true)]
    private Collection $qualities;

    /**
     * @var Collection<int, Format>
     */
    #[ORM\OneToMany(mappedBy: 'product', targetEntity: Format::class, orphanRemoval: true)]
    private Collection $formats;

    /**
     * @var Collection<int, ProductImage>
     */
    #[ORM\OneToMany(targetEntity: ProductImage::class, mappedBy: 'product')]
    private Collection $images;

    public function __construct()
    {
        $this->calibers = new ArrayCollection();
        $this->qualities = new ArrayCollection();
        $this->formats = new ArrayCollection();
        $this->images = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;
        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): static
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function isOutOfSeason(): bool
    {
        return $this->isOutOfSeason;
    }

    public function setIsOutOfSeason(bool $isOutOfSeason): static
    {
        $this->isOutOfSeason = $isOutOfSeason;
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

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;
        return $this;
    }

    /**
     * @return Collection<int, Caliber>
     */
    public function getCalibers(): Collection
    {
        return $this->calibers;
    }

    public function addCaliber(Caliber $caliber): static
    {
        if (!$this->calibers->contains($caliber)) {
            $this->calibers->add($caliber);
            $caliber->setProduct($this);
        }

        return $this;
    }

    public function removeCaliber(Caliber $caliber): static
    {
        if ($this->calibers->removeElement($caliber)) {
            if ($caliber->getProduct() === $this) {
                $caliber->setProduct(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Quality>
     */
    public function getQualities(): Collection
    {
        return $this->qualities;
    }

    public function addQuality(Quality $quality): static
    {
        if (!$this->qualities->contains($quality)) {
            $this->qualities->add($quality);
            $quality->setProduct($this);
        }

        return $this;
    }

    public function removeQuality(Quality $quality): static
    {
        if ($this->qualities->removeElement($quality)) {
            if ($quality->getProduct() === $this) {
                $quality->setProduct(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Format>
     */
    public function getFormats(): Collection
    {
        return $this->formats;
    }

    public function addFormat(Format $format): static
    {
        if (!$this->formats->contains($format)) {
            $this->formats->add($format);
            $format->setProduct($this);
        }

        return $this;
    }

    public function removeFormat(Format $format): static
    {
        if ($this->formats->removeElement($format)) {
            if ($format->getProduct() === $this) {
                $format->setProduct(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ProductImage>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(ProductImage $image): static
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setProduct($this);
        }

        return $this;
    }

    public function removeImage(ProductImage $image): static
    {
        if ($this->images->removeElement($image)) {
            if ($image->getProduct() === $this) {
                $image->setProduct(null);
            }
        }

        return $this;
    }
}
