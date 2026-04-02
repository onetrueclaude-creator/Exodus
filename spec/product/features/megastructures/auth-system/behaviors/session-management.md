Feature: Session management

  Background:
    Given the auth system is running

  Scenario: Create session on login
    Given valid credentials
    When the user logs in
    Then a session is created with expiry timestamp

  Scenario: Refresh session before expiry
    Given an active session nearing expiry
    When the user calls POST /api/auth/refresh
    Then a new JWT is issued and session expiry is extended

  Scenario: Invalidate session on logout
    Given an active session
    When the user calls POST /api/auth/logout
    Then the session is invalidated and JWT is blacklisted
