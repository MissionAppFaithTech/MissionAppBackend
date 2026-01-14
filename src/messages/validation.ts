import {
	MAX_PASSWORD_SIZE,
	MIN_PASSWORD_SIZE,
	VALID_DATE_RANGE_YEARS,
} from "@constants/validation-constants";

export const MAIN_ACTIVITY_AREA_AND_SPECIFIC_ACTIVITY_DESCRIPTION =
	'Se "Outra" for selecionada como a área principal de atividade, uma descrição deve ser fornecida — e não deve ser fornecida caso contrário';

export const SCHOLARSHIP_HOLDER_AND_SPONSORING_ORGANIZATION =
	"Se você é bolsista, deve fornecer a organização patrocinadora — e deve deixar em branco caso contrário";

export const INVALID_CPF = "CPF inválido";

export const INVALID_CPF_LENGTH = "O CPF deve conter 11 dígitos";

export const INVALID_CPF_FORMAT = "Formato de CPF inválido";

export const MONTH_YEAR_INVALID_FORMAT = "A data deve estar no formato AAAA-MM";

export const INVALID_DATE_RANGE = `Data inválida. Só é permitido um intervalo de até ${VALID_DATE_RANGE_YEARS} anos a partir do ano atual`;

export const INVALID_ORCID_FORMAT =
	"Formato de número ORCID inválido. Deve ser fornecido no formato: 0000-0000-0000-0000";

export const INVALID_PASSWORD_FORMAT =
	"A senha deve conter pelo menos 8 caracteres, uma letra maiúscula, um número e um caractere especial";

export const INVALID_INNER_SPACES = "Este campo não pode conter espaços";

export const COMPLETION_DATE_BEFORE_START_DATE =
	"A data de conclusão do curso não pode ser anterior à data de início";

export const INVALID_AUTHENTICATION_INPUT =
	"Erro de autenticação: formato de e-mail, nome de usuário ou senha inválido";

export const ACTIVITY_AREA_MISSING_DESCRIPTION =
	'Se a área for escolhida como "OUTRA", uma descrição deve ser fornecida — e não deve ser fornecida caso contrário';

export const INVALID_EDUCATION_LEVEL_VALUE =
	"Valor de nível de escolaridade inválido. Por favor, selecione uma opção válida";

export const INVALID_OCCUPATION_VALUE =
	"Valor de ocupação inválido. Por favor, selecione uma opção válida";

export const INVALID_RNE_FORMAT = "Formato de RNE inválido";

export const INVALID_PASSPORT_FORMAT = "Formato de passaporte inválido";

export const INVALID_ASTROBIOLOGY_OR_RELATED_START_YEAR = `Valor inválido. Escolha um ano menor ou igual a ${new Date().getFullYear()}`;

export const PASSWORD_TOO_SHORT = `A senha deve ter pelo menos ${MIN_PASSWORD_SIZE} caracteres`;

export const PASSWORD_TOO_LONG = `A senha deve ter no máximo ${MAX_PASSWORD_SIZE} caracteres`;

export const PASSWORD_UPPERCASE =
	"A senha deve conter pelo menos uma letra maiúscula";

export const PASSWORD_LOWERCASE =
	"A senha deve conter pelo menos uma letra minúscula";

export const PASSWORD_DIGIT = "A senha deve conter pelo menos um número";

export const PASSWORD_SPECIAL_CHARACTER =
	"A senha deve conter pelo menos um caractere especial";
