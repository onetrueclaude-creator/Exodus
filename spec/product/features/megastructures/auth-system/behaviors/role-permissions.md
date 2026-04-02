Feature: Role-based permissions

  Background:
    Given the auth system is initialized with roles

  Scenario: Admin has full access
    Given a user with admin role
    When they access any API endpoint
    Then the request is authorized

  Scenario: Regular user has limited access
    Given a user with regular role
    When they access an admin-only endpoint
    Then a 403 Forbidden response is returned

  Scenario: Assign role to user
    Given an admin user
    When they assign a role to another user via POST /api/auth/roles
    Then the target user's role is updated
