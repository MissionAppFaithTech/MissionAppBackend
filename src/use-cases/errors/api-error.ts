export class ApiError extends Error {
	public status: number;
	public body: { code: string; message: string };

	constructor(error: {
		status: number;
		body: { code: string; message: string };
	}) {
		super(error.body.message);
		this.name = this.constructor.name;
		this.status = error.status;
		this.body = error.body;
	}
}
