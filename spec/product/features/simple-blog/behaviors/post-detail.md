Feature: Post detail

  Background:
    Given the blog app is rendered with at least one post

  Scenario: Clicking a post title shows the full body
    Given I can see the post list
    When I click a post title
    Then the post body text is visible on screen
    And the post list is no longer visible

  Scenario: Back button returns to post list
    Given I am viewing a post's full body
    When I click the Back button
    Then the post list is visible again
    And the post body is no longer visible
