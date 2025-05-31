import { json } from '@sveltejs/kit';
import { simpleMigrationService } from '$lib/services/simple-migration-service';

export async function GET() {
	try {
		console.log('🔧 Testing database connection...');

		// Initialize database
		await simpleMigrationService.init();

		// Health check
		const isHealthy = await simpleMigrationService.healthCheck();

		// Get database info
		const dbInfo = await simpleMigrationService.getDatabaseInfo();

		// Create test data if needed
		const testDataCreated = await simpleMigrationService.createTestData();

		return json({
			status: 'success',
			healthy: isHealthy,
			database: dbInfo,
			testDataCreated,
			message: 'Database connection and setup successful'
		});
	} catch (error) {
		console.error('Database test error:', error);
		return json(
			{
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
}
