export const ENV = import.meta.env.MODE;
export const API_HOST = ENV === 'production' ? '' : 'http://10.0.10.48:5000/';
