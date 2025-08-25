// Generated from src/backend/types/label-generation.ts
// Do not edit manually

export const LabelDSLSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    version: {
      type: 'string',
      const: '1',
    },
    canvas: {
      type: 'object',
      properties: {
        width: {
          type: 'integer',
          exclusiveMinimum: 0,
          maximum: 9007199254740991,
        },
        height: {
          type: 'integer',
          exclusiveMinimum: 0,
          maximum: 9007199254740991,
        },
        dpi: {
          default: 144,
          type: 'integer',
          exclusiveMinimum: 0,
          maximum: 9007199254740991,
        },
        background: {
          type: 'string',
        },
      },
      required: ['width', 'height', 'dpi', 'background'],
      additionalProperties: false,
    },
    palette: {
      type: 'object',
      properties: {
        primary: {
          type: 'string',
        },
        secondary: {
          type: 'string',
        },
        accent: {
          type: 'string',
        },
        background: {
          type: 'string',
        },
        temperature: {
          type: 'string',
          enum: ['warm', 'cool', 'neutral'],
        },
        contrast: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
        },
      },
      required: ['primary', 'secondary', 'accent', 'background', 'temperature', 'contrast'],
      additionalProperties: false,
    },
    typography: {
      type: 'object',
      properties: {
        primary: {
          type: 'object',
          properties: {
            family: {
              type: 'string',
            },
            weight: {
              type: 'number',
              minimum: 100,
              maximum: 900,
            },
            style: {
              type: 'string',
              enum: ['normal', 'italic'],
            },
            letterSpacing: {
              type: 'number',
            },
          },
          required: ['family', 'weight', 'style', 'letterSpacing'],
          additionalProperties: false,
        },
        secondary: {
          type: 'object',
          properties: {
            family: {
              type: 'string',
            },
            weight: {
              type: 'number',
              minimum: 100,
              maximum: 900,
            },
            style: {
              type: 'string',
              enum: ['normal', 'italic'],
            },
            letterSpacing: {
              type: 'number',
            },
          },
          required: ['family', 'weight', 'style', 'letterSpacing'],
          additionalProperties: false,
        },
        hierarchy: {
          type: 'object',
          properties: {
            producerEmphasis: {
              type: 'string',
              enum: ['dominant', 'balanced', 'subtle'],
            },
            vintageProminence: {
              type: 'string',
              enum: ['featured', 'standard', 'minimal'],
            },
            regionDisplay: {
              type: 'string',
              enum: ['prominent', 'integrated', 'subtle'],
            },
          },
          required: ['producerEmphasis', 'vintageProminence', 'regionDisplay'],
          additionalProperties: false,
        },
      },
      required: ['primary', 'secondary', 'hierarchy'],
      additionalProperties: false,
    },
    fonts: {
      type: 'object',
      properties: {
        primaryUrl: {
          type: 'string',
          format: 'uri',
        },
        secondaryUrl: {
          type: 'string',
          format: 'uri',
        },
      },
      additionalProperties: false,
    },
    assets: {
      default: [],
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          type: {
            type: 'string',
            const: 'image',
          },
          url: {
            type: 'string',
            format: 'uri',
          },
          width: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991,
          },
          height: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991,
          },
        },
        required: ['id', 'type', 'url', 'width', 'height'],
        additionalProperties: false,
      },
    },
    elements: {
      default: [],
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              bounds: {
                type: 'object',
                properties: {
                  x: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  y: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  w: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  h: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                },
                required: ['x', 'y', 'w', 'h'],
                additionalProperties: false,
              },
              z: {
                type: 'integer',
                minimum: 0,
                maximum: 1000,
              },
              type: {
                type: 'string',
                const: 'text',
              },
              text: {
                type: 'string',
              },
              font: {
                type: 'string',
                enum: ['primary', 'secondary'],
              },
              color: {
                type: 'string',
                enum: ['primary', 'secondary', 'accent', 'background'],
              },
              align: {
                default: 'left',
                type: 'string',
                enum: ['left', 'center', 'right'],
              },
              fontSize: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991,
              },
              lineHeight: {
                default: 1.2,
                type: 'number',
                exclusiveMinimum: 0,
              },
              maxLines: {
                default: 1,
                type: 'integer',
                minimum: 1,
                maximum: 10,
              },
              textTransform: {
                default: 'none',
                type: 'string',
                enum: ['uppercase', 'lowercase', 'none'],
              },
            },
            required: [
              'id',
              'bounds',
              'z',
              'type',
              'text',
              'font',
              'color',
              'align',
              'fontSize',
              'lineHeight',
              'maxLines',
              'textTransform',
            ],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              bounds: {
                type: 'object',
                properties: {
                  x: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  y: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  w: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  h: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                },
                required: ['x', 'y', 'w', 'h'],
                additionalProperties: false,
              },
              z: {
                type: 'integer',
                minimum: 0,
                maximum: 1000,
              },
              type: {
                type: 'string',
                const: 'image',
              },
              assetId: {
                type: 'string',
              },
              fit: {
                default: 'contain',
                type: 'string',
                enum: ['contain', 'cover', 'fill'],
              },
              opacity: {
                default: 1,
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
              rotation: {
                default: 0,
                type: 'number',
                minimum: -180,
                maximum: 180,
              },
            },
            required: ['id', 'bounds', 'z', 'type', 'assetId', 'fit', 'opacity', 'rotation'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              bounds: {
                type: 'object',
                properties: {
                  x: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  y: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  w: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  h: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                },
                required: ['x', 'y', 'w', 'h'],
                additionalProperties: false,
              },
              z: {
                type: 'integer',
                minimum: 0,
                maximum: 1000,
              },
              type: {
                type: 'string',
                const: 'shape',
              },
              shape: {
                type: 'string',
                enum: ['rect', 'line'],
              },
              color: {
                type: 'string',
                enum: ['primary', 'secondary', 'accent', 'background'],
              },
              strokeWidth: {
                default: 0,
                type: 'number',
                minimum: 0,
                maximum: 20,
              },
              rotation: {
                default: 0,
                type: 'number',
                minimum: -180,
                maximum: 180,
              },
            },
            required: ['id', 'bounds', 'z', 'type', 'shape', 'color', 'strokeWidth', 'rotation'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ['version', 'canvas', 'palette', 'typography', 'assets', 'elements'],
  additionalProperties: false,
} as const;
