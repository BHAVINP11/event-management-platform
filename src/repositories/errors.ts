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

export class RepositoryDataError extends RepositoryError {
  constructor(message = 'Repository data validation error') {
    super(message);
    this.name = 'RepositoryDataError';
  }
}
