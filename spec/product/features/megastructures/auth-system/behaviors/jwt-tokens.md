Feature: JWT token authentication

  Background:
    Given the Monolith server is running

  Scenario: Generate JWT on login
    Given valid user credentials
    When the user authenticates via POST /api/auth/login
    Then a signed JWT is returned with user ID and role

  Scenario: Validate JWT on protected routes
    Given a valid JWT token
    When a request is made to a protected endpoint
    Then the request is authorized and user context is available

  Scenario: Reject expired JWT
    Given an expired JWT token
    When a request is made to a protected endpoint
    Then a 401 Unauthorized response is returned
