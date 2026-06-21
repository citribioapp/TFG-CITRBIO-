<?php

namespace App\EventSubscriber;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\HttpKernel\KernelInterface;

class InitialAdminSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $passwordHasher,
        private KernelInterface $kernel
    ) {}

    public function onRequestEvent(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        if ($this->kernel->getEnvironment() !== 'prod') {
            return;
        }

        $adminExists = $this->em->getRepository(User::class)
            ->findOneBy(['email' => $_SERVER['INITIAL_ADMIN_EMAIL'] ?? null]);

        if ($adminExists) {
            return;
        }

        $email = $_SERVER['INITIAL_ADMIN_EMAIL'] ?? null;
        $password = $_SERVER['INITIAL_ADMIN_PASSWORD'] ?? null;

        if (!$email || !$password) {
            return;
        }

        $user = new User();
        $user->setEmail($email);
        $user->setRoles(['ROLE_ADMIN']);
        $user->setPassword(
            $this->passwordHasher->hashPassword($user, $password)
        );

        $this->em->persist($user);
        $this->em->flush();
    }

    public static function getSubscribedEvents(): array
    {
        return [
            RequestEvent::class => 'onRequestEvent',
        ];
    }
}