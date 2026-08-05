# Next Service Calculation — Client Explanation

## Purpose

The system predicts when a vehicle should return for its next service. It checks both:

1. Distance travelled in KMS
2. Engine/vehicle running hours

The vehicle must be serviced when either limit is reached. Therefore, the system selects the earlier result.

## Required Job Card Inputs

### KMS calculation

- Current KMS
- Next Service KMS
- Average KMS Running Per Day

### Hours calculation

- Current Running Hours
- Next Service Hours
- Average Hours Running Per Day

## Formula

```text
KMS Days = CEILING((Next Service KMS - Current KMS) / Average KMS Per Day)

Hours Days = CEILING((Next Service Hours - Current Hours) / Average Hours Per Day)

Next Service Days = the smaller value of KMS Days and Hours Days

Next Service Date = Job Card Entry Date + Next Service Days
```

`CEILING` means a partial day is rounded up to the next complete calendar day.

## Worked Example

Assume the following Job Card values:

| Input | Value |
|---|---:|
| Entry Date | 01-Aug-2026 |
| Current KMS | 50,000 |
| Next Service KMS | 55,000 |
| Average KMS Per Day | 200 |
| Current Hours | 3,000 |
| Next Service Hours | 3,100 |
| Average Hours Per Day | 5 |

### KMS result

```text
(55,000 - 50,000) / 200 = 25 days
```

### Hours result

```text
(3,100 - 3,000) / 5 = 20 days
```

The hours limit will be reached first, so:

```text
Next Service Days = 20 days
Next Service Date = 01-Aug-2026 + 20 days = 21-Aug-2026
```

## System Rules

- If both valid calculations exist, the earlier day is selected.
- If only the KMS values are available, the KMS calculation is used.
- If only the Hours values are available, the Hours calculation is used.
- If the next target has already been reached or exceeded, the result is `0 days` and the vehicle is treated as **Service Due**.
- If neither average value is greater than zero, the system cannot predict a Next Service Date.
- The calculation uses calendar days and daily averages. It is a forecast, not a live GPS, odometer or biometric reading.
- The result is recalculated when Entry Date, Current value, Next value or Average Per Day changes.

## Dashboard Reminder

The calculated Next Service Date is stored in the Job Card. The dashboard uses it to show:

- Already overdue services
- Services due today
- Services due within the next seven days

The reminder includes customer name, vehicle number and contact number so the service team can follow up easily.

## Short Explanation for the Client

“We calculate how many days are left based on kilometres and running hours separately. Since a vehicle may reach either limit first, the software chooses the smaller number of days. That value is added to the Job Card date to produce the Next Service Date. Due and upcoming vehicles are then shown on the dashboard for customer follow-up.”
