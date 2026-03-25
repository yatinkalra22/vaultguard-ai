import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const domain = config.getOrThrow<string>('AUTH0_DOMAIN');

    super({
      // WHY: JWKS (JSON Web Key Set) fetches Auth0's public keys dynamically
      // to verify RS256-signed JWTs. This avoids hardcoding keys and handles
      // key rotation automatically. Cache + rate limit prevent abuse.
      // See: https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-key-sets
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: `https://${domain}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: config.getOrThrow<string>('AUTH0_AUDIENCE'),
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
    });
  }

  // WHY: validate() runs after JWT signature is verified. The returned object
  // becomes req.user on every authenticated request.
  validate(payload: Record<string, unknown>) {
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      orgId: payload.org_id as string | undefined,
    };
  }
}
