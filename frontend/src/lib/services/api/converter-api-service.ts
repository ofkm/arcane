import BaseAPIService from './api-service';

export default class ConverterAPIService extends BaseAPIService {
	async convert(dockerRunCommand: string) {
		const res = await this.api.post('/stacks/convert', {
			dockerRunCommand
		});
		return res.data;
	}
}
