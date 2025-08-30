import type {
  DetailedLayoutOutput,
  ImageGenerateInput,
  ImageGenerateOutput,
  RefineInput,
  RefineOutput,
  RenderOutput,
} from '../../schema/langchain-pipeline-schemas.js';
import type { LabelStorageService } from '../../services/label-storage-service.js';
import { createImageAsset } from '../../types/asset-types.js';
import { logger } from '../logger.js';
import type { ImageModelAdapter, MockChatModel, RendererAdapter, VisionRefinerAdapter } from './types.js';

// ============================================================================
// Mock LLM for Testing
// ============================================================================

export class MockChatModelImpl implements MockChatModel {
  _llmType(): string {
    return 'mock-chat-model';
  }

  async invoke(input: string): Promise<string> {
    logger.debug('MockChatModel: Generating mock response', {
      inputLength: input.length,
    });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate appropriate mock JSON based on the prompt content
    if (input.includes('design scheme') || input.includes('design-scheme')) {
      return JSON.stringify({
        version: '1',
        canvas: {
          width: 750,
          height: 1000,
          dpi: 300,
          background: '#F5F5DC',
        },
        palette: {
          primary: '#722F37',
          secondary: '#D4AF37',
          accent: '#2F4F2F',
          background: '#F5F5DC',
          temperature: 'warm',
          contrast: 'medium',
        },
        typography: {
          primary: {
            family: 'serif',
            weight: 600,
            style: 'normal',
            letterSpacing: 0,
          },
          secondary: {
            family: 'sans-serif',
            weight: 400,
            style: 'normal',
            letterSpacing: 0.3,
          },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'featured',
            regionDisplay: 'integrated',
          },
        },
        assets: [],
        elements: [],
      });
    }

    if (input.includes('image prompts') || input.includes('image-prompts')) {
      return JSON.stringify({
        expectedPrompts: 2,
        prompts: [
          {
            id: 'background-mock',
            purpose: 'background',
            prompt: 'Elegant vineyard landscape with warm golden lighting',
            aspect: '3:2',
            negativePrompt: 'harsh lighting, artificial',
            guidance: 7.5,
          },
          {
            id: 'decoration-mock',
            purpose: 'decoration',
            prompt: 'Watercolor grape cluster illustration, elegant and minimal',
            aspect: '1:1',
            negativePrompt: 'photorealistic, busy',
            guidance: 8.0,
          },
        ],
      });
    }

    if (input.includes('detailed layout') || input.includes('detailed-layout')) {
      return JSON.stringify({
        version: '1',
        canvas: {
          width: 750,
          height: 1000,
          dpi: 300,
          background: '#F5F5DC',
        },
        palette: {
          primary: '#722F37',
          secondary: '#D4AF37',
          accent: '#2F4F2F',
          background: '#F5F5DC',
          temperature: 'warm',
          contrast: 'medium',
        },
        typography: {
          primary: {
            family: 'serif',
            weight: 600,
            style: 'normal',
            letterSpacing: 0,
          },
          secondary: {
            family: 'sans-serif',
            weight: 400,
            style: 'normal',
            letterSpacing: 0.3,
          },
          hierarchy: {
            producerEmphasis: 'balanced',
            vintageProminence: 'featured',
            regionDisplay: 'integrated',
          },
        },
        assets: [],
        elements: [
          {
            id: 'producer',
            type: 'text',
            bounds: { x: 0.1, y: 0.1, w: 0.8, h: 0.1 },
            z: 10,
            text: 'Mock Winery',
            font: 'primary',
            color: 'primary',
            align: 'center',
            fontSize: 36,
            lineHeight: 1.2,
            maxLines: 1,
            textTransform: 'uppercase',
          },
        ],
      });
    }

    // Default mock response
    return JSON.stringify({
      message: 'Mock LLM response',
      timestamp: new Date().toISOString(),
    });
  }

  // Required LangChain methods (minimal implementation)
  async _generate(messages: Array<{ text?: string; content?: string }>): Promise<{
    generations: Array<{
      text: string;
      message: { content: string };
    }>;
  }> {
    const input = messages.map((m) => m.text || m.content || '').join(' ');
    const response = await this.invoke(input);
    return {
      generations: [
        {
          text: response,
          message: { content: response },
        },
      ],
    };
  }
}

// ============================================================================
// Mock Adapters for Testing
// ============================================================================

export class MockImageAdapter implements ImageModelAdapter {
  async generate(prompt: ImageGenerateInput): Promise<ImageGenerateOutput> {
    logger.info('MockImageAdapter: Generating mock image URL for testing', {
      promptId: prompt.id,
      purpose: prompt.purpose,
    });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Use offline mode in CI/test environments or when specified
    const useOfflineMode = process.env.MOCK_IMAGES_OFFLINE === 'true' || process.env.CI === 'true';

    const mockUrl = useOfflineMode ? this.generateDataUri(prompt.id, 800, 600) : this.getMockImageUrl(prompt.purpose);

    // Return fixed dimensions for consistent testing
    return createImageAsset(`asset-${prompt.id}`, mockUrl, 800, 600);
  }

  private getMockImageUrl(purpose: string): string {
    // Map purposes to available mock images
    const imageMap: Record<string, string> = {
      background: 'background.png',
      decoration: 'decoration.png',
      foreground: 'foreground.png',
    };

    // Use specific image for known purposes, fallback to background
    const imageName = imageMap[purpose] || 'background.png';
    return `https://winette.vercel.app/mock-images/${imageName}`;
  }

  private generateDataUri(id: string, width: number, height: number): string {
    // Generate a simple SVG data URI that works completely offline
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#e5e5e5"/>
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="none" stroke="#999" stroke-width="2"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
            font-family="Arial, sans-serif" font-size="24" fill="#666">${id}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
}

export class MockVisionRefiner implements VisionRefinerAdapter {
  // input parameter required by VisionRefinerAdapter interface but unused in mock implementation
  async proposeEdits(input: RefineInput): Promise<RefineOutput> {
    logger.info('MockVisionRefiner: Analyzing preview for refinement', {
      submissionId: input.submission.producerName,
    });

    // Simulate analysis time
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      operations: [],
      reasoning: 'Label appears well-balanced and follows design principles',
      confidence: 0.85,
    };
  }
}

export class MockRendererAdapter implements RendererAdapter {
  constructor(private storageService?: LabelStorageService) {}

  async render(
    input: DetailedLayoutOutput,
    _options?: { debug?: boolean; saveToFile?: boolean },
  ): Promise<RenderOutput> {
    logger.info('MockRendererAdapter: Rendering preview (mock)', {
      elementCount: input.elements?.length ?? 0,
      canvasSize: `${input.canvas.width}x${input.canvas.height}`,
    });

    // Simulate rendering time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Use storage service if provided, otherwise generate mock URL directly
    let previewUrl: string;
    if (this.storageService) {
      // Create mock buffer for storage service
      const mockBuffer = Buffer.from('mock-image-data');
      const generationId = `mock-${Date.now()}`;
      previewUrl = await this.storageService.storeRenderedLabel(mockBuffer, generationId);
    } else {
      // Fallback to direct mock URL generation
      const mockImageName = `mock-label-${Date.now()}.png`;
      previewUrl = `https://winette.vercel.app/mock-images/${mockImageName}`;
    }

    return {
      previewUrl,
      width: input.canvas.width,
      height: input.canvas.height,
      format: 'PNG' as const,
    };
  }
}
