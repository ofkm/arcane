import BaseAPIService from './api-service';

export default class EncryptionAPIService extends BaseAPIService {
	async encrypt(data: any): Promise<string> {
		const response = await this.api.post('/encrypt', { data });
		return response.data.encrypted;
	}

	async decrypt(encryptedData: string): Promise<any> {
		const response = await this.api.post('/decrypt', { encrypted: encryptedData });
		return response.data.data;
	}
}
