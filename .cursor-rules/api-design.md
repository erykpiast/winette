# API Design Guidelines for AI Agents

## Schema Validation Between Backend and Frontend

### Principle

**REQUIRED:** All API endpoints must be validated against shared schemas between backend and frontend code to
ensure type safety and data consistency.

### OpenAPI Schema as Source of Truth

**REQUIRED:** Use OpenAPI schema as the single source of truth for API contracts

```typescript
// src/backend/schema/openapi.json - Single source of truth
{
  "openapi": "3.0.0",
  "info": {
    "title": "Winette API",
    "version": "1.0.0"
  },
  "components": {
    "schemas": {
      "WineLabel": {
        "type": "object",
        "required": ["id", "name", "winery", "vintage", "region", "style"],
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid",
            "description": "Unique identifier for the wine label"
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "description": "Name of the wine"
          },
          "winery": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100,
            "description": "Name of the winery"
          },
          "vintage": {
            "type": "integer",
            "minimum": 1800,
            "maximum": 2030,
            "description": "Year the wine was produced"
          },
          "region": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100,
            "description": "Geographic region where wine was produced"
          },
          "grape_variety": {
            "type": "string",
            "maxLength": 200,
            "description": "Types of grapes used"
          },
          "alcohol_content": {
            "type": "number",
            "minimum": 0,
            "maximum": 50,
            "description": "Alcohol content percentage"
          },
          "tasting_notes": {
            "type": "string",
            "maxLength": 1000,
            "description": "Tasting notes and description"
          },
          "style": {
            "type": "string",
            "enum": ["red", "white", "rosé", "sparkling"],
            "description": "Style of wine"
          },
          "created_at": {
            "type": "string",
            "format": "date-time",
            "description": "When the record was created"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time",
            "description": "When the record was last updated"
          }
        }
      },
      "CreateWineLabelRequest": {
        "type": "object",
        "required": ["name", "winery", "vintage", "region", "style"],
        "properties": {
          "name": { "$ref": "#/components/schemas/WineLabel/properties/name" },
          "winery": { "$ref": "#/components/schemas/WineLabel/properties/winery" },
          "vintage": { "$ref": "#/components/schemas/WineLabel/properties/vintage" },
          "region": { "$ref": "#/components/schemas/WineLabel/properties/region" },
          "grape_variety": { "$ref": "#/components/schemas/WineLabel/properties/grape_variety" },
          "alcohol_content": { "$ref": "#/components/schemas/WineLabel/properties/alcohol_content" },
          "tasting_notes": { "$ref": "#/components/schemas/WineLabel/properties/tasting_notes" },
          "style": { "$ref": "#/components/schemas/WineLabel/properties/style" }
        }
      },
      "ApiError": {
        "type": "object",
        "required": ["error", "statusCode"],
        "properties": {
          "error": {
            "type": "string",
            "description": "Error message"
          },
          "statusCode": {
            "type": "integer",
            "description": "HTTP status code"
          },
          "errorCode": {
            "type": "string",
            "description": "Application-specific error code"
          },
          "details": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "field": { "type": "string" },
                "message": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

### Type Generation from Schema

**REQUIRED:** Generate TypeScript types from OpenAPI schema for frontend use

```typescript
// scripts/generate-api-types.ts
import { generateApi } from 'swagger-typescript-api';
import { resolve } from 'path';

export async function generateApiTypes(): Promise<void> {
  await generateApi({
    name: 'api.ts',
    output: resolve(process.cwd(), 'src/frontend/types'),
    url: 'http://localhost:3001/api/docs/json',
    httpClientType: 'fetch',
    generateClient: false, // Only generate types
    generateRouteTypes: true,
    extractRequestParams: true,
    extractRequestBody: true,
    extractResponseBody: true,
    extractResponseError: true,
  });
}

// Package.json script
{
  "scripts": {
    "generate:api-types": "tsx scripts/generate-api-types.ts"
  }
}
```

### Backend Schema Validation

**REQUIRED:** Validate all request/response data against schemas in backend

```typescript
// src/backend/lib/validation.ts
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { Request, Response, NextFunction } from "express";
import { openApiSchema } from "../schema/openapi.json";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Compile schemas from OpenAPI
const schemas = new Map<string, any>();
for (const [name, schema] of Object.entries(openApiSchema.components.schemas)) {
  schemas.set(name, ajv.compile(schema));
}

/**
 * Middleware to validate request body against schema
 */
export function validateRequestBody(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validator = schemas.get(schemaName);

    if (!validator) {
      res.status(500).json({
        error: "Internal server error",
        statusCode: 500,
        errorCode: "SCHEMA_NOT_FOUND",
      });
      return;
    }

    const isValid = validator(req.body);

    if (!isValid) {
      res.status(422).json({
        error: "Validation failed",
        statusCode: 422,
        errorCode: "VALIDATION_ERROR",
        details: validator.errors?.map((error) => ({
          field:
            error.instancePath.replace("/", "") ||
            error.params?.missingProperty,
          message: error.message || "Invalid value",
        })),
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to validate response data against schema
 */
export function validateResponseBody(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;

    res.send = function (body: any) {
      const validator = schemas.get(schemaName);

      if (validator && !validator(body)) {
        console.error("Response validation failed:", validator.errors);
        // In development, return validation error
        if (process.env.NODE_ENV === "development") {
          return originalSend.call(this, {
            error: "Response validation failed",
            statusCode: 500,
            details: validator.errors,
          });
        }
      }

      return originalSend.call(this, body);
    };

    next();
  };
}
```

### API Endpoint Implementation

**REQUIRED:** Implement endpoints with proper validation and error handling

```typescript
// src/backend/routes/wine-labels.ts
import { Router } from "express";
import { validateRequestBody, validateResponseBody } from "../lib/validation";
import { WineLabelService } from "../services/wine-label-service";
import type { components } from "../types/api";

type WineLabel = components["schemas"]["WineLabel"];
type CreateWineLabelRequest = components["schemas"]["CreateWineLabelRequest"];

const router = Router();
const wineLabelService = new WineLabelService();

// GET /api/wine-labels
router.get("/", validateResponseBody("WineLabel"), async (req, res, next) => {
  try {
    const { style, region, vintage_min, vintage_max } = req.query;

    const filters = {
      style: style as string,
      region: region as string,
      vintage_min: vintage_min ? parseInt(vintage_min as string) : undefined,
      vintage_max: vintage_max ? parseInt(vintage_max as string) : undefined,
    };

    const wineLabels = await wineLabelService.findAll(filters);
    res.json(wineLabels);
  } catch (error) {
    next(error);
  }
});

// GET /api/wine-labels/:id
router.get(
  "/:id",
  validateResponseBody("WineLabel"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const wineLabel = await wineLabelService.findById(id);

      if (!wineLabel) {
        res.status(404).json({
          error: "Wine label not found",
          statusCode: 404,
          errorCode: "WINE_LABEL_NOT_FOUND",
        });
        return;
      }

      res.json(wineLabel);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/wine-labels
router.post(
  "/",
  validateRequestBody("CreateWineLabelRequest"),
  validateResponseBody("WineLabel"),
  async (req, res, next) => {
    try {
      const wineData = req.body as CreateWineLabelRequest;
      const newWineLabel = await wineLabelService.create(wineData);

      res.status(201).json(newWineLabel);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/wine-labels/:id
router.put(
  "/:id",
  validateRequestBody("CreateWineLabelRequest"),
  validateResponseBody("WineLabel"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const wineData = req.body as CreateWineLabelRequest;

      const updatedWineLabel = await wineLabelService.update(id, wineData);

      if (!updatedWineLabel) {
        res.status(404).json({
          error: "Wine label not found",
          statusCode: 404,
          errorCode: "WINE_LABEL_NOT_FOUND",
        });
        return;
      }

      res.json(updatedWineLabel);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/wine-labels/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await wineLabelService.delete(id);

    if (!deleted) {
      res.status(404).json({
        error: "Wine label not found",
        statusCode: 404,
        errorCode: "WINE_LABEL_NOT_FOUND",
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as wineLabelRoutes };
```

### Frontend Schema Validation

**REQUIRED:** Validate API responses on the frontend using generated types

```typescript
// src/frontend/lib/api-client.ts
import { z } from "zod";
import type { components } from "../types/api";

type WineLabel = components["schemas"]["WineLabel"];
type CreateWineLabelRequest = components["schemas"]["CreateWineLabelRequest"];

// Create Zod schemas for runtime validation
export const wineLabelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  winery: z.string().min(1).max(100),
  vintage: z.number().int().min(1800).max(2030),
  region: z.string().min(1).max(100),
  grape_variety: z.string().max(200).optional(),
  alcohol_content: z.number().min(0).max(50).optional(),
  tasting_notes: z.string().max(1000).optional(),
  style: z.enum(["red", "white", "rosé", "sparkling"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const createWineLabelSchema = z.object({
  name: z.string().min(1).max(200),
  winery: z.string().min(1).max(100),
  vintage: z.number().int().min(1800).max(2030),
  region: z.string().min(1).max(100),
  grape_variety: z.string().max(200).optional(),
  alcohol_content: z.number().min(0).max(50).optional(),
  tasting_notes: z.string().max(1000).optional(),
  style: z.enum(["red", "white", "rosé", "sparkling"]),
});

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async getWineLabels(filters?: {
    style?: string;
    region?: string;
    vintage_min?: number;
    vintage_max?: number;
  }): Promise<WineLabel[]> {
    const url = new URL("/api/wine-labels", this.baseURL);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new ApiClientError("Failed to fetch wine labels", response.status);
    }

    const data = await response.json();

    // Validate response data
    const validatedData = wineLabelSchema.array().parse(data);
    return validatedData;
  }

  async getWineLabel(id: string): Promise<WineLabel> {
    const response = await fetch(`${this.baseURL}/api/wine-labels/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiClientError("Wine label not found", 404);
      }
      throw new ApiClientError("Failed to fetch wine label", response.status);
    }

    const data = await response.json();
    const validatedData = wineLabelSchema.parse(data);
    return validatedData;
  }

  async createWineLabel(wineData: CreateWineLabelRequest): Promise<WineLabel> {
    // Validate input data
    const validatedInput = createWineLabelSchema.parse(wineData);

    const response = await fetch(`${this.baseURL}/api/wine-labels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedInput),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiClientError(
        errorData.error || "Failed to create wine label",
        response.status,
        errorData.errorCode,
        errorData.details
      );
    }

    const data = await response.json();
    const validatedData = wineLabelSchema.parse(data);
    return validatedData;
  }
}
```

## Endpoint Design Standards

### RESTful API Patterns

**REQUIRED:** Follow consistent RESTful patterns for all endpoints

```typescript
// Standard CRUD operations
GET    /api/wine-labels           # List all wine labels (with filtering)
GET    /api/wine-labels/:id       # Get specific wine label
POST   /api/wine-labels           # Create new wine label
PUT    /api/wine-labels/:id       # Update wine label (full replacement)
PATCH  /api/wine-labels/:id       # Partial update wine label
DELETE /api/wine-labels/:id       # Delete wine label

// Nested resources
GET    /api/wine-labels/:id/reviews        # Get reviews for a wine
POST   /api/wine-labels/:id/reviews        # Create review for a wine
GET    /api/wine-labels/:id/reviews/:reviewId # Get specific review
PUT    /api/wine-labels/:id/reviews/:reviewId # Update review
DELETE /api/wine-labels/:id/reviews/:reviewId # Delete review

// Action endpoints (when REST doesn't fit)
POST   /api/wine-labels/:id/favorite       # Add to favorites
DELETE /api/wine-labels/:id/favorite       # Remove from favorites
POST   /api/wine-labels/search             # Complex search
POST   /api/wine-labels/bulk-import        # Bulk operations
```

### Query Parameter Standards

**REQUIRED:** Use consistent query parameter patterns

```typescript
// Filtering
GET /api/wine-labels?style=red&region=bordeaux&vintage_min=2015&vintage_max=2020

// Sorting
GET /api/wine-labels?sort=vintage&order=desc
GET /api/wine-labels?sort=name,vintage&order=asc,desc

// Pagination
GET /api/wine-labels?page=2&limit=20
GET /api/wine-labels?offset=40&limit=20

// Field selection
GET /api/wine-labels?fields=id,name,vintage,style

// Search
GET /api/wine-labels?search=margaux&searchFields=name,winery

// Include related data
GET /api/wine-labels?include=reviews,ratings
```

### Response Format Standards

**REQUIRED:** Use consistent response formats

```typescript
// Success responses
{
  "data": WineLabel | WineLabel[],
  "meta"?: {
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  }
}

// Error responses
{
  "error": string,
  "statusCode": number,
  "errorCode"?: string,
  "details"?: Array<{
    "field": string,
    "message": string
  }>
}

// Validation error example
{
  "error": "Validation failed",
  "statusCode": 422,
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "field": "vintage",
      "message": "Vintage must be between 1800 and 2030"
    },
    {
      "field": "style",
      "message": "Style must be one of: red, white, rosé, sparkling"
    }
  ]
}
```

### Error Handling Standards

**REQUIRED:** Implement comprehensive error handling

```typescript
// src/backend/middleware/error-handler.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface ApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  details?: Array<{ field: string; message: string }>;
}

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("API Error:", error);

  // Zod validation errors
  if (error instanceof ZodError) {
    res.status(422).json({
      error: "Validation failed",
      statusCode: 422,
      errorCode: "VALIDATION_ERROR",
      details: error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    });
    return;
  }

  // Custom API errors
  if (error.statusCode) {
    res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      details: error.details,
    });
    return;
  }

  // Database errors
  if (error.name === "SequelizeValidationError") {
    res.status(422).json({
      error: "Database validation failed",
      statusCode: 422,
      errorCode: "DATABASE_VALIDATION_ERROR",
      details: error.errors?.map((err) => ({
        field: err.path,
        message: err.message,
      })),
    });
    return;
  }

  // Default server error
  res.status(500).json({
    error: "Internal server error",
    statusCode: 500,
    errorCode: "INTERNAL_SERVER_ERROR",
  });
}

// Custom error classes
export class ValidationError extends Error {
  statusCode = 422;
  errorCode = "VALIDATION_ERROR";

  constructor(
    message: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  errorCode = "NOT_FOUND";

  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  errorCode = "CONFLICT";

  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
```

### API Documentation Standards

**REQUIRED:** Maintain comprehensive API documentation

```typescript
// src/backend/docs/openapi.ts
import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Winette API",
      version: "1.0.0",
      description: "Wine catalog and management API",
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:3001",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/backend/routes/*.ts"], // Path to API route files
};

export const specs = swaggerJSDoc(options);

// Add to route documentation
/**
 * @swagger
 * /api/wine-labels:
 *   get:
 *     summary: Get all wine labels
 *     tags: [Wine Labels]
 *     parameters:
 *       - in: query
 *         name: style
 *         schema:
 *           type: string
 *           enum: [red, white, rosé, sparkling]
 *         description: Filter by wine style
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
 *     responses:
 *       200:
 *         description: List of wine labels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WineLabel'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
```

### API Testing Standards

**REQUIRED:** Test all endpoints thoroughly

```typescript
// src/backend/routes/__tests__/wine-labels.test.ts
import request from "supertest";
import { app } from "../../app";
import { WineLabelService } from "../../services/wine-label-service";

jest.mock("../../services/wine-label-service");

describe("Wine Labels API", () => {
  let mockWineLabelService: jest.Mocked<WineLabelService>;

  beforeEach(() => {
    mockWineLabelService = WineLabelService as jest.Mocked<
      typeof WineLabelService
    >;
  });

  describe("GET /api/wine-labels", () => {
    it("should return all wine labels", async () => {
      const mockWines = [{ id: "1", name: "Test Wine", style: "red" }];

      mockWineLabelService.prototype.findAll.mockResolvedValue(mockWines);

      const response = await request(app).get("/api/wine-labels").expect(200);

      expect(response.body).toEqual(mockWines);
    });

    it("should filter wine labels by style", async () => {
      mockWineLabelService.prototype.findAll.mockResolvedValue([]);

      await request(app).get("/api/wine-labels?style=red").expect(200);

      expect(mockWineLabelService.prototype.findAll).toHaveBeenCalledWith({
        style: "red",
        region: undefined,
        vintage_min: undefined,
        vintage_max: undefined,
      });
    });
  });

  describe("POST /api/wine-labels", () => {
    it("should create a new wine label", async () => {
      const newWine = {
        name: "New Wine",
        winery: "Test Winery",
        vintage: 2020,
        region: "Test Region",
        style: "red" as const,
      };

      const createdWine = { id: "123", ...newWine };
      mockWineLabelService.prototype.create.mockResolvedValue(createdWine);

      const response = await request(app)
        .post("/api/wine-labels")
        .send(newWine)
        .expect(201);

      expect(response.body).toEqual(createdWine);
    });

    it("should validate required fields", async () => {
      const invalidWine = {
        name: "", // Invalid: empty name
        vintage: 1500, // Invalid: too old
      };

      await request(app).post("/api/wine-labels").send(invalidWine).expect(422);
    });
  });
});
```
