import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger'

export const API_PREFIX = 'api/v1'
export const DOCS_PATH = 'docs'

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Nest Starter API')
    .setDescription('REST API. Every error follows the `ErrorResponse` schema.')
    .setVersion('1.0.0')
    .addServer(`/${API_PREFIX}`)
    .addBearerAuth()
    .build()

  return SwaggerModule.createDocument(app, config, {
    // Paths are relative to the server URL (/api/v1), like the frontend API client expects.
    ignoreGlobalPrefix: true,
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  })
}

export function setupSwaggerUi(app: INestApplication, document: OpenAPIObject): void {
  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: `${DOCS_PATH}/openapi.json`,
    swaggerOptions: { persistAuthorization: true },
  })
}
