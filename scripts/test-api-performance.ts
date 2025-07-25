import dotenv from 'dotenv';

dotenv.config();

interface PerformanceResult {
  requestNumber: number;
  status: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

async function testApiPerformance(): Promise<void> {
  console.log('🚀 Testing API Performance (Rate Limiting Status)');
  console.log('==================================================');

  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3001';
  const rateLimitingDisabled = process.env.DISABLE_RATE_LIMITING === 'true';

  console.log(`🎯 Testing against: ${baseUrl}`);
  console.log(`⚙️  Rate limiting: ${rateLimitingDisabled ? 'DISABLED' : 'ENABLED'}`);

  if (!rateLimitingDisabled) {
    console.log('\n💡 To disable rate limiting for faster testing:');
    console.log('   Add DISABLE_RATE_LIMITING=true to your .env file');
    console.log('   Or run: DISABLE_RATE_LIMITING=true pnpm test:performance');
  }

  const results: PerformanceResult[] = [];
  const testCount = 10;

  console.log(`\n📊 Running ${testCount} sequential requests...`);

  for (let i = 1; i <= testCount; i++) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'performance-tester/1.0',
        },
      });

      const responseTime = Date.now() - startTime;

      results.push({
        requestNumber: i,
        status: response.status,
        responseTime,
        success: response.ok,
      });

      // Show progress
      const statusEmoji = response.ok ? '✅' : '❌';
      console.log(`   ${statusEmoji} Request #${i}: ${response.status} - ${responseTime}ms`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      results.push({
        requestNumber: i,
        status: 0,
        responseTime,
        success: false,
        error: errorMsg,
      });

      console.log(`   ❌ Request #${i}: Error - ${errorMsg} (${responseTime}ms)`);
    }

    // Small delay between requests to be nice to the server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Analyze results
  console.log('\n📈 Performance Analysis:');
  console.log('========================');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful requests: ${successful.length}/${testCount}`);
  console.log(`❌ Failed requests: ${failed.length}/${testCount}`);

  if (successful.length > 0) {
    const responseTimes = successful.map((r) => r.responseTime);
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);

    console.log(`⏱️  Average response time: ${avgTime.toFixed(1)}ms`);
    console.log(`⚡ Fastest response: ${minTime}ms`);
    console.log(`🐌 Slowest response: ${maxTime}ms`);

    // Performance evaluation
    if (avgTime < 100) {
      console.log('🎉 Excellent performance!');
    } else if (avgTime < 500) {
      console.log('✅ Good performance');
    } else if (avgTime < 2000) {
      console.log('⚠️  Slow performance - investigate Redis connection');
    } else {
      console.log('🚨 Very slow performance - Redis likely timing out');
    }
  }

  if (failed.length > 0) {
    console.log('\n💥 Failed requests:');
    failed.forEach((result) => {
      console.log(`   Request #${result.requestNumber}: ${result.error || 'Unknown error'}`);
    });
  }

  console.log('\n💡 Tips for better performance:');
  console.log('   - Set DISABLE_RATE_LIMITING=true in .env for local development');
  console.log('   - Check your Redis configuration if responses are > 500ms');
  console.log('   - Ensure Upstash Redis is in the same region for production');
}

// Allow custom URL
const customUrl = process.argv[2];
if (customUrl) {
  process.env.TEST_BASE_URL = customUrl;
  console.log(`🎯 Using custom URL: ${customUrl}`);
}

testApiPerformance().catch(console.error);
