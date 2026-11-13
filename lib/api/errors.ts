/**
 * Error raised for every failed API call, whatever the cause (HTTP status,
 * network failure, timeout). Pages only ever deal with this one type.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  0: 'Connexion au serveur impossible. Vérifiez votre réseau.',
  400: 'Certaines informations sont invalides.',
  401: 'Votre session a expiré. Merci de vous reconnecter.',
  403: "Vous n'avez pas les droits pour cette action.",
  404: 'Élément introuvable.',
  409: 'Cet élément existe déjà.',
  413: 'Le fichier envoyé est trop volumineux.',
  423: 'Ce compte est temporairement verrouillé.',
  429: 'Trop de tentatives. Réessayez dans quelques minutes.',
  500: 'Une erreur est survenue sur le serveur.',
  502: 'Le serveur est momentanément indisponible.',
  503: 'Le serveur est momentanément indisponible.',
  504: 'Le serveur met trop de temps à répondre.',
};

/** Backend error codes whose message is English: show French instead. */
const CODE_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'Email ou mot de passe incorrect.',
  'Email not verified': "Votre adresse email n'est pas encore confirmée. Consultez votre boîte de réception.",
  'Account inactive': 'Ce compte a été désactivé.',
  'Tenant inactive': 'Ce salon a été désactivé.',
  'Invalid account': "Ce compte n'est rattaché à aucun salon.",
  'Tenant mismatch': "Vous n'avez pas accès à ce salon.",
  'Forbidden salons': "Vous n'avez pas accès à ce salon.",
  'Invalid token': 'Votre session a expiré. Merci de vous reconnecter.',
  Unauthorized: 'Votre session a expiré. Merci de vous reconnecter.',
  Conflict: 'Cet élément existe déjà.',
  'Session revoked': 'Votre session a été fermée. Merci de vous reconnecter.',
  'Too many requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
};

export function defaultMessageFor(status: number): string {
  return STATUS_MESSAGES[status] ?? (status >= 500 ? STATUS_MESSAGES[500] : STATUS_MESSAGES[400]);
}

/**
 * The backend answers errors as `{ error, message }` (sometimes only one of
 * them, sometimes HTML from Express' default 404). Normalise all of it.
 */
export function toApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;
    const code = typeof body.error === 'string' ? body.error : `HTTP_${status}`;
    const message =
      CODE_MESSAGES[code] ??
      (typeof body.message === 'string' && body.message.trim() ? body.message : defaultMessageFor(status));
    return new ApiError(status, code, message, body.details);
  }
  return new ApiError(status, `HTTP_${status}`, defaultMessageFor(status));
}

/** Human readable message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return defaultMessageFor(500);
}
