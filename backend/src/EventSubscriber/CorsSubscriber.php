<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Secondary CORS layer inside Symfony.
 *
 * The primary CORS layer lives in public/index.php and runs unconditionally
 * before Symfony boots. This subscriber is a belt-and-suspenders addition that
 * ensures CORS headers are present on responses built by Symfony controllers,
 * in case the PHP headers set in index.php are overwritten by Symfony's
 * Response object (which replaces the raw header buffer).
 */
class CorsSubscriber implements EventSubscriberInterface
{
    /** @var string[] */
    private readonly array $allowedOrigins;

    /** @var string[] */
    private readonly array $allowedMethods;

    /** @var string[] */
    private readonly array $allowedHeaders;

    /**
     * @param string[]|string $allowedOrigins
     * @param string[]|string $allowedMethods
     * @param string[]|string $allowedHeaders
     */
    public function __construct(
        array|string $allowedOrigins,
        array|string $allowedMethods,
        array|string $allowedHeaders,
    ) {
        $this->allowedOrigins = self::toArray($allowedOrigins);
        $this->allowedMethods = self::toArray($allowedMethods);
        $this->allowedHeaders = self::toArray($allowedHeaders);
    }

    public static function getSubscribedEvents(): array
    {
        return [
            // Priority 1000: handle OPTIONS before the security firewall runs.
            KernelEvents::REQUEST  => ['onKernelRequest', 1000],
            // Priority 0: add headers to every successful API response.
            KernelEvents::RESPONSE => ['onKernelResponse', 0],
        ];
    }

    /** Handle OPTIONS preflight — return 204 with CORS headers immediately. */
    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        if (!$this->isApi($request) || $request->getMethod() !== 'OPTIONS') {
            return;
        }

        $response = new Response('', Response::HTTP_NO_CONTENT);
        $this->apply($request->headers->get('Origin'), $response);
        $response->headers->set('Access-Control-Max-Age', '3600');
        $event->setResponse($response);
    }

    /** Add CORS headers to every API response. */
    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        if (!$this->isApi($request)) {
            return;
        }

        $this->apply($request->headers->get('Origin'), $event->getResponse());
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function isApi(Request $request): bool
    {
        return str_starts_with($request->getPathInfo(), '/api');
    }

    private function apply(?string $origin, Response $response): void
    {
        if ($origin === null || $origin === '') {
            return;
        }

        // Fallback: if the container was built without env vars, use hardcoded list.
        $origins = $this->allowedOrigins ?: [
            'https://citribio-frontend.vercel.app',
            'http://localhost:4200',
            'http://127.0.0.1:4200',
        ];

        if (!in_array($origin, $origins, true) && !in_array('*', $origins, true)) {
            return;
        }

        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Methods', implode(', ', $this->allowedMethods ?: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']));
        $response->headers->set('Access-Control-Allow-Headers', implode(', ', $this->allowedHeaders ?: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']));
        $response->headers->set('Vary', 'Origin');
    }

    /**
     * @param string[]|string $value
     * @return string[]
     */
    private static function toArray(array|string $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('trim', $value)));
        }

        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }
}
