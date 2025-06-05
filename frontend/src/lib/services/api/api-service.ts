import axios from 'axios';

abstract class BaseAPIService {
	api = axios.create({
		withCredentials: true
	});

	constructor() {
		this.api.defaults.baseURL = '/api';
	}
}

export default BaseAPIService;
