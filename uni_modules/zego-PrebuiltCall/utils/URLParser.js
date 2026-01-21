export class URLParser {
    static append(path, params) {
        const base = path.includes('?') ? path : `${path}?`;
        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        return queryString ? `${base}${queryString}` : path;
    }
    static parse(path) {
        const params = {};
        const queryString = path.split('?')[1];
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key) {
                    params[key] = params[key] ? [...params[key], value] : value;
                }
            });
        }
        return params;
    }
}
