# **App Name**: EVE Market Navigator

## Core Features:

- Market History Fetch: Fetch historical market data (price, volume, order count) for a specified item and region using the EVE Online ESI.
- Order Book Snapshot: Retrieve active buy and sell orders for a given item and region from the EVE Online ESI.
- Margin Calculator: Calculate potential net margin based on user-defined broker fees, sales tax, and desired profit margin, considering both buy and sell prices.
- Price Range Recommendation: Determine feasible buy and sell price ranges that satisfy the user's margin requirements, incorporating historical data and order book depth.
- Volume Estimation: Estimate executable volume based on market history and order book depth, providing a realistic upper bound for trading.
- Execution Time Estimation: Estimate the time window required to execute a trade based on the available volume in the order book.
- Data Integrity Tool: This tool analyzes EVE Online market data for potential discrepancies and insufficient data points. Using generative AI it assesses the consistency and reliability of market information, providing flags on possibly dubious numbers that could skew trading strategies. The tool gives the user enhanced insight regarding the decision support system. It also determines whether the amount of data is statistically reliable, to provide recommendations with integrity.  

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to evoke trust and stability, referencing the space setting of EVE Online.
- Background color: Dark gray (#303030) for a sophisticated and focused feel, in a dark color scheme.
- Accent color: Light orange (#FF9800) for highlighting key data points and calls to action.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern look.
- Use clean, minimalist icons to represent market data and actions.
- Divide the UI into clear panels for raw market data, order book snapshots, derived metrics, and recommendations.
- Use subtle animations for data loading and updates to provide a smooth user experience.