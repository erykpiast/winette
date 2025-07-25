import dotenv from 'dotenv';

dotenv.config();

interface RateLimitTestResult {
  requestNumber: number;
  status: number;
  rateLimitLimit?: string;
  rateLimitRemaining?: string;
  rateLimitReset?: string;
  responseTime: number;
  error?: string;
}

class RateLimitTester {
  private baseUrl: string;
  private results: RateLimitTestResult[] = [];

  constructor(baseUrl?: string) {
    // Default to local development, but allow override via environment or parameter
    this.baseUrl = baseUrl || process.env.TEST_BASE_URL || 'http://localhost:3001';
    console.log(`🎯 Testing rate limiting against: ${this.baseUrl}`);
  }

  async makeRequest(requestNumber: number): Promise<RateLimitTestResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'rate-limit-tester/1.0',
        },
      });

      const responseTime = Date.now() - startTime;

      const result: RateLimitTestResult = {
        requestNumber,
        status: response.status,
        responseTime,
      };

      // Only add headers if they exist
      const limitHeader = response.headers.get('X-RateLimit-Limit');
      if (limitHeader) result.rateLimitLimit = limitHeader;

      const remainingHeader = response.headers.get('X-RateLimit-Remaining');
      if (remainingHeader) result.rateLimitRemaining = remainingHeader;

      const resetHeader = response.headers.get('X-RateLimit-Reset');
      if (resetHeader) result.rateLimitReset = resetHeader;

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        requestNumber,
        status: 0,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testBatch(startRequest: number, batchSize: number, delayMs: number = 100): Promise<void> {
    console.log(`\n📊 Testing batch ${startRequest}-${startRequest + batchSize - 1}:`);

    for (let i = 0; i < batchSize; i++) {
      const requestNumber = startRequest + i;
      const result = await this.makeRequest(requestNumber);
      this.results.push(result);

      // Log every 10th request or important status changes
      if (requestNumber % 10 === 0 || result.status === 429 || result.error) {
        this.logResult(result);
      }

      // Add small delay to avoid overwhelming the server
      if (delayMs > 0 && i < batchSize - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // If we hit rate limit, show a few more attempts then break
      if (result.status === 429) {
        console.log('🚫 Rate limit hit! Testing a few more requests...');

        // Test 3 more requests to confirm rate limiting is consistent
        for (let j = 1; j <= 3; j++) {
          const extraResult = await this.makeRequest(requestNumber + j);
          this.results.push(extraResult);
          this.logResult(extraResult);

          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
        break;
      }
    }
  }

  private logResult(result: RateLimitTestResult): void {
    const statusEmoji = result.status === 200 ? '✅' : result.status === 429 ? '🚫' : '❌';
    const resetTime = result.rateLimitReset
      ? new Date(Number(result.rateLimitReset) * 1000).toLocaleTimeString()
      : 'N/A';

    console.log(
      `   ${statusEmoji} Request #${result.requestNumber}: ` +
        `${result.status} | ` +
        `Remaining: ${result.rateLimitRemaining || 'N/A'} | ` +
        `Reset: ${resetTime} | ` +
        `${result.responseTime}ms` +
        (result.error ? ` | Error: ${result.error}` : ''),
    );
  }

  printSummary(): void {
    console.log('\n📈 Test Summary:');
    console.log('================');

    const successfulRequests = this.results.filter((r) => r.status === 200);
    const rateLimitedRequests = this.results.filter((r) => r.status === 429);
    const errorRequests = this.results.filter((r) => r.status !== 200 && r.status !== 429);

    console.log(`Total requests: ${this.results.length}`);
    console.log(`✅ Successful (200): ${successfulRequests.length}`);
    console.log(`🚫 Rate limited (429): ${rateLimitedRequests.length}`);
    console.log(`❌ Errors: ${errorRequests.length}`);

    if (successfulRequests.length > 0) {
      const avgResponseTime =
        successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      console.log(`⏱️  Average response time: ${avgResponseTime.toFixed(1)}ms`);
    }

    // Show rate limiting progression
    const withHeaders = this.results.filter((r) => r.rateLimitRemaining !== undefined);
    if (withHeaders.length > 0) {
      console.log('\n📊 Rate Limit Progression:');
      const samples = withHeaders.filter((result, i) => i % 10 === 0 || result.status === 429);
      samples.forEach((result) => {
        console.log(`   Request #${result.requestNumber}: ${result.rateLimitRemaining} remaining`);
      });
    }

    // Validate rate limiting behavior
    console.log('\n🔍 Rate Limiting Validation:');
    const firstRateLimited = rateLimitedRequests[0];
    if (firstRateLimited) {
      console.log(`✅ Rate limiting triggered at request #${firstRateLimited.requestNumber}`);
      console.log(`✅ Rate limit headers present: ${firstRateLimited.rateLimitLimit ? 'Yes' : 'No'}`);

      // Check if all subsequent requests were also rate limited
      const subsequentRequests = this.results.filter((r) => r.requestNumber > firstRateLimited.requestNumber);
      const allSubsequentRateLimited = subsequentRequests.every((r) => r.status === 429);
      console.log(`✅ Subsequent requests rate limited: ${allSubsequentRateLimited ? 'Yes' : 'No'}`);
    } else {
      console.log('⚠️  Rate limiting not triggered - consider testing with more requests');
    }
  }
}

async function testRateLimiting(): Promise<void> {
  console.log('🚀 Starting Rate Limiting Test');
  console.log('==============================');

  const tester = new RateLimitTester();

  try {
    // Test with initial batch to see normal behavior
    await tester.testBatch(1, 20, 50);

    // Test larger batch to trigger rate limiting
    // Rate limit is 100 requests per 15 minutes, so we'll test up to 110
    await tester.testBatch(21, 90, 25);

    tester.printSummary();

    console.log('\n🎉 Rate limiting test completed!');
    console.log('\n💡 Tips:');
    console.log('   - Run with TEST_BASE_URL env var to test against deployed endpoint');
    console.log('   - Example: TEST_BASE_URL=https://your-app.vercel.app pnpm test:rate-limit');
    console.log('   - Rate limit window is 15 minutes, so wait before retesting');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Allow running with custom URL as command line argument
const customUrl = process.argv[2];
if (customUrl) {
  console.log(`🎯 Using custom URL: ${customUrl}`);
  new RateLimitTester(customUrl).testBatch(1, 110, 25).then(() => process.exit(0));
} else {
  testRateLimiting().catch(console.error);
}
