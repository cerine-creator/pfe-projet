import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Gestionnaire d'exceptions DRF personnalisé.

    - Toutes les erreurs HTTP connues (400, 401, 403, 404...) passent normalement.
    - Les erreurs inattendues (crash Python / 500) sont interceptées, loguées
      côté serveur, et retournent un JSON propre sans stack trace.

    Cela empêche toute fuite d'information sur l'architecture interne.
    """
    # Laisse DRF gérer les erreurs qu'il connaît
    response = exception_handler(exc, context)

    if response is not None:
        # Reformater la réponse pour un format JSON cohérent
        if isinstance(response.data, dict) and 'detail' in response.data:
            # Déjà au bon format
            return response
        return response

    # Erreur inattendue — ne jamais exposer la stack trace au client
    view = context.get('view', None)
    logger.error(
        f"Erreur interne non gérée dans {view.__class__.__name__ if view else 'Unknown'}: {exc}",
        exc_info=True,
    )

    return Response(
        {
            'error': "Une erreur inattendue s'est produite. Veuillez contacter l'administrateur."
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
