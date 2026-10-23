// ============================================================
//  Vending Machine - Finite State Machine (Moore type)
//  5th Sem Electronics Mini Project
//
//  Products : A = Rs10, B = Rs15, C = Rs20, D = Rs25
//  Coins    : 01 = Rs5, 10 = Rs10, 11 = Rs20 (00 = no coin)
//  Extras   : stock count per product (3 each) + total sales
// ============================================================
module vending_machine (
    input  wire       clk,
    input  wire       rst,         // synchronous reset (active high)
    input  wire       sel_valid,   // 1 = a product button is pressed
    input  wire [1:0] sel,         // which product: 0=A 1=B 2=C 3=D
    input  wire [1:0] coin,        // coin inserted this clock cycle
    input  wire       cancel,      // cancel button

    output reg  [2:0]  state,       // current FSM state
    output reg  [7:0]  amount,      // money inserted so far
    output reg  [7:0]  price,       // price of selected product
    output reg  [1:0]  item,        // selected product
    output wire        dispense,    // 1 = product is coming out
    output wire [7:0]  change,      // change returned to customer
    output wire [7:0]  refund,      // money returned on cancel
    output reg         sold_out,    // 1 = selected product is out of stock
    output reg  [15:0] total_sales, // total money earned by machine
    output reg  [1:0]  stock_a,     // units left of each product
    output reg  [1:0]  stock_b,
    output reg  [1:0]  stock_c,
    output reg  [1:0]  stock_d
);

    // ---------------- State encoding ----------------
    localparam IDLE      = 3'd0;  // waiting for product selection
    localparam WAIT_COIN = 3'd1;  // waiting for enough money
    localparam DISPENSE  = 3'd2;  // give out the product
    localparam CHANGE    = 3'd3;  // give back extra money
    localparam REFUND    = 3'd4;  // cancel pressed, return all money

    // ---------------- Coin value decoder ----------------
    reg [7:0] coin_value;
    always @(*) begin
        case (coin)
            2'b01:   coin_value = 8'd5;
            2'b10:   coin_value = 8'd10;
            2'b11:   coin_value = 8'd20;
            default: coin_value = 8'd0;
        endcase
    end

    // ---------------- Price lookup for the pressed button ----------------
    reg [7:0] sel_price;
    always @(*) begin
        case (sel)
            2'd0:    sel_price = 8'd10;   // A
            2'd1:    sel_price = 8'd15;   // B
            2'd2:    sel_price = 8'd20;   // C
            default: sel_price = 8'd25;   // D
        endcase
    end

    // ---------------- Stock of the pressed button ----------------
    reg [1:0] sel_stock;
    always @(*) begin
        case (sel)
            2'd0:    sel_stock = stock_a;
            2'd1:    sel_stock = stock_b;
            2'd2:    sel_stock = stock_c;
            default: sel_stock = stock_d;
        endcase
    end

    // money after adding this cycle's coin
    wire [7:0] new_amount = amount + coin_value;

    // ---------------- Moore outputs (depend only on state) ----------------
    assign dispense = (state == DISPENSE);
    assign change   = (state == CHANGE) ? (amount - price) : 8'd0;
    assign refund   = (state == REFUND) ? amount           : 8'd0;

    // ---------------- State machine ----------------
    always @(posedge clk) begin
        if (rst) begin
            state       <= IDLE;
            amount      <= 8'd0;
            price       <= 8'd0;
            item        <= 2'd0;
            sold_out    <= 1'b0;
            total_sales <= 16'd0;
            stock_a     <= 2'd3;
            stock_b     <= 2'd3;
            stock_c     <= 2'd3;
            stock_d     <= 2'd3;
        end else begin
            case (state)
                // Wait for the customer to choose a product
                IDLE: begin
                    if (sel_valid) begin
                        if (sel_stock == 2'd0) begin
                            sold_out <= 1'b1;          // reject, stay in IDLE
                        end else begin
                            sold_out <= 1'b0;
                            item     <= sel;
                            price    <= sel_price;
                            amount   <= 8'd0;
                            state    <= WAIT_COIN;
                        end
                    end
                end

                // Collect coins until amount >= price
                WAIT_COIN: begin
                    if (cancel)
                        state <= REFUND;
                    else if (coin != 2'b00) begin
                        amount <= new_amount;
                        if (new_amount >= price)
                            state <= DISPENSE;
                    end
                end

                // Product drops out: reduce stock, add to sales
                DISPENSE: begin
                    case (item)
                        2'd0: stock_a <= stock_a - 2'd1;
                        2'd1: stock_b <= stock_b - 2'd1;
                        2'd2: stock_c <= stock_c - 2'd1;
                        2'd3: stock_d <= stock_d - 2'd1;
                    endcase
                    total_sales <= total_sales + price;
                    state       <= CHANGE;
                end

                // Change (amount - price) is shown for one cycle
                CHANGE: begin
                    amount <= 8'd0;
                    state  <= IDLE;
                end

                // All inserted money is shown as refund for one cycle
                REFUND: begin
                    amount <= 8'd0;
                    state  <= IDLE;
                end

                default: state <= IDLE;
            endcase
        end
    end

endmodule
