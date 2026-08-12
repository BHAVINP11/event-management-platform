export class RepositoryError extends Error {
  constructor(message = 'Repository error') {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class RepositoryInfrastructureError extends RepositoryError {
  constructor(message = 'Repository infrastructure error') {
    super(message);
    this.name = 'RepositoryInfrastructureError';
  }
}
