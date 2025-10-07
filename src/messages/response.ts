import { MAX_IMAGE_FILE_SIZE_BYTES } from '@constants/file-constants'

export const NO_USERS_AVAILABLE = {
  status: 204,
  body: {
    code: 'NO_USERS_AVAILABLE',
    message: 'Nenhuma informação de usuários disponível para exportação',
  },
}

export const INVALID_CREDENTIALS = {
  status: 401,
  body: {
    code: 'INVALID_CREDENTIALS',
    message: 'Credenciais inválidas',
  },
}

export const MISSING_AUTHORIZATION_TOKEN = {
  status: 401,
  body: {
    code: 'MISSING_AUTHORIZATION_TOKEN',
    message: 'Token de autorização ausente',
  },
}

export const INVALID_AREA_OF_ACTIVITY = {
  status: 400,
  body: {
    code: 'INVALID_AREA_OF_ACTIVITY',
    message: 'Área de atuação inválida',
  },
}

export const INVALID_OR_EXPIRED_TOKEN = {
  status: 401,
  body: {
    code: 'INVALID_OR_EXPIRED_TOKEN',
    message: 'Token inválido ou expirado',
  },
}

export const RESOURCE_NOT_FOUND = {
  status: 404,
  body: {
    code: 'RESOURCE_NOT_FOUND',
    message: 'Recurso não encontrado',
  },
}

export const USER_ALREADY_EXISTS = {
  status: 409,
  body: {
    code: 'USER_ALREADY_EXISTS',
    message: 'O usuário já existe',
  },
}

export const USER_ALREADY_HAS_ADDRESS = {
  status: 409,
  body: {
    code: 'USER_ALREADY_HAS_ADDRESS',
    message: 'O usuário já possui um endereço',
  },
}

export const USER_IMAGE_PROCESSING_ERROR = {
  status: 500,
  body: {
    code: 'USER_IMAGE_PROCESSING_ERROR',
    message: 'Erro ao tentar processar a foto de perfil do usuário',
  },
}

export const USER_NOT_FOUND = {
  status: 404,
  body: {
    code: 'USER_NOT_FOUND',
    message: 'Usuário não encontrado',
  },
}

export const PASSWORD_RESET_IF_USER_EXISTS = {
  status: 200,
  body: {
    code: 'PASSWORD_RESET_IF_USER_EXISTS',
    message: 'Se o usuário existir, você receberá um e-mail com instruções para redefinir a senha',
  },
}

export const USER_WITH_SAME_EMAIL_OR_USERNAME = {
  status: 409,
  body: {
    code: 'USER_WITH_SAME_EMAIL_OR_USERNAME',
    message: 'Já existe um usuário com o mesmo e-mail ou nome de usuário',
  },
}

export const FORBIDDEN = {
  status: 403,
  body: {
    code: 'FORBIDDEN',
    message: 'Usuário não tem permissão para usar este recurso',
  },
}

export const UNAUTHORIZED = {
  status: 401,
  body: {
    code: 'UNAUTHORIZED',
    message: 'Usuário não autenticado',
  },
}

export const BODY_REQUIRED = {
  status: 400,
  body: {
    code: 'BODY_REQUIRED',
    message: 'O corpo da requisição está ausente',
  },
}

export const INVALID_INSTITUTION_NAME = {
  status: 400,
  body: {
    code: 'INVALID_INSTITUTION_NAME',
    message: 'Nome da instituição inválido',
  },
}

export const MISSING_CHECK_AVAILABILITIES_INPUT = {
  status: 400,
  body: {
    code: 'MISSING_CHECK_AVAILABILITIES_INPUT',
    message: 'Propriedades de entrada ausentes. Forneça pelo menos uma delas',
  },
}

export const IDENTITY_DOCUMENT_ALREADY_USED = {
  status: 409,
  body: {
    code: 'IDENTITY_DOCUMENT_ALREADY_USED',
    message: 'Documento de identidade já utilizado',
  },
}

export const INACTIVE_USER = {
  status: 403,
  body: {
    code: 'INACTIVE_USER',
    message: 'Usuário atualmente inativo',
  },
}

export const IDENTITY_INFO_MISSING = {
  status: 400,
  body: {
    code: 'IDENTITY_INFO_MISSING',
    message: 'Você deve fornecer simultaneamente um tipo de documento e um valor de documento',
  },
}

export const IMAGE_TOO_BIG = {
  status: 413,
  body: {
    code: 'IMAGE_TOO_BIG',
    message: `O arquivo de imagem é muito grande! Forneça uma imagem de no máximo ${MAX_IMAGE_FILE_SIZE_BYTES}Mb`,
  },
}

export const TOO_MANY_REQUESTS = {
  status: 429,
  body: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Você excedeu o limite de requisições. Por favor, tente novamente mais tarde',
  },
}

export const VALIDATION_ERROR = {
  status: 400,
  body: {
    code: 'VALIDATION_ERROR',
    message: 'Erro de validação!',
  },
}

export const INTERNAL_SERVER_ERROR = {
  status: 500,
  body: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno no servidor',
  },
}

export const ASYNC_LOCAL_STORAGE_NOT_INITIALIZED_ERROR = {
  status: 500,
  body: {
    code: 'ASYNC_LOCAL_STORAGE_NOT_INITIALIZED_ERROR',
    message: 'Erro ao iniciar o local storage da requisição',
  },
}

export const SYNTAX_ERROR = {
  status: 400,
  body: {
    code: 'SYNTAX_ERROR',
    message: 'Erro de sintaxe nos dados fornecidos',
  },
}

export const LOGOUT = {
  status: 200,
  body: {
    code: 'SUCCESSFUL_LOGOUT',
    message: 'Logout bem sucedido!',
  },
}

export const PASSWORD_RESET_SUCCESSFUL = {
  status: 200,
  body: {
    code: 'PASSWORD_RESET_SUCCESSFUL',
    message: 'Senha redefinida com sucesso!',
  },
}

export const BLOG_NOT_FOUND = {
  status: 404,
  body: {
    code: 'BLOG_NOT_FOUND',
    message: 'O blog solicitado não foi encontrado',
  },
}

export const MEETING_NOT_FOUND = {
  status: 404,
  body: {
    code: 'MEETING_NOT_FOUND',
    message: 'Reunião não encontrada',
  },
}

export const MEETING_ALREADY_FINISHED = {
  status: 409,
  body: {
    code: 'MEETING_ALREADY_FINISHED',
    message: 'A reunião já foi finalizada',
  },
}

export const USER_ALREADY_REGISTERED_IN_MEETING = {
  status: 409,
  body: {
    code: 'USER_ALREADY_REGISTERED_IN_MEETING',
    message: 'O usuário já está cadastrado na reunião',
  },
}

export const GUEST_ALREADY_REGISTERED_IN_MEETING = {
  status: 409,
  body: {
    code: 'GUEST_ALREADY_REGISTERED_IN_MEETING',
    message: 'O convidado com este email já está cadastrado na reunião',
  },
}
