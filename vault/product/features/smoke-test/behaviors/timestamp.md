Feature: Get current timestamp

  Scenario: Returns ISO format timestamp
    Given the timestamp utility is imported
    When get_timestamp() is called
    Then it returns a string in ISO 8601 format
