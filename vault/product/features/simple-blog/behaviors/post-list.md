Feature: Post list

  Background:
    Given the blog app is rendered

  Scenario: Home screen shows all post titles
    Given there are 3 hardcoded posts
    When the app loads
    Then I see the title of each post on screen

  Scenario: Home screen shows post summaries
    Given there are 3 hardcoded posts
    When the app loads
    Then I see the summary of each post beneath its title
