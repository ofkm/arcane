import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function pullTestImages() {
	console.log('Pulling test images for e2e tests...');

	try {
		// Pull a small test image that won't consume much space
		await execPromise('docker pull nginx:latest');
		console.log('Successfully pulled nginx:latest');

		// Optional: Pull another image for multi-image tests
		await execPromise('docker pull busybox:latest');
		console.log('Successfully pulled busybox:latest');

		console.log('Test images ready');
	} catch (error) {
		console.error('Failed to pull test images:', error);
		process.exit(1);
	}
}

pullTestImages();
