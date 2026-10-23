// ============================================================
//  Self-checking testbench for vending_machine
//  Run:  iverilog -o tb tb_vending_machine.v vending_machine.v
//        vvp tb
//  Waveform is saved to vending.vcd (open in GTKWave / Surfer)
// ============================================================
`timescale 1ns/1ps
module tb_vending_machine;

    reg        clk = 0;
    reg        rst = 1;
    reg        sel_valid = 0;
    reg  [1:0] sel = 0;
    reg  [1:0] coin = 0;
    reg        cancel = 0;

    wire [2:0]  state;
    wire [7:0]  amount, price, change, refund;
    wire [1:0]  item, stock_a, stock_b, stock_c, stock_d;
    wire        dispense, sold_out;
    wire [15:0] total_sales;

    vending_machine dut (
        .clk(clk), .rst(rst), .sel_valid(sel_valid), .sel(sel),
        .coin(coin), .cancel(cancel),
        .state(state), .amount(amount), .price(price), .item(item),
        .dispense(dispense), .change(change), .refund(refund),
        .sold_out(sold_out), .total_sales(total_sales),
        .stock_a(stock_a), .stock_b(stock_b),
        .stock_c(stock_c), .stock_d(stock_d)
    );

    always #5 clk = ~clk;   // 10 ns clock period

    integer errors = 0;

    // ----- small helpers (one input for one clock) -----
    task press(input [1:0] p);
        begin sel = p; sel_valid = 1; @(posedge clk); #1 sel_valid = 0; end
    endtask

    task insert(input [1:0] c);
        begin coin = c; @(posedge clk); #1 coin = 0; end
    endtask

    task press_cancel;
        begin cancel = 1; @(posedge clk); #1 cancel = 0; end
    endtask

    task check(input [255:0] name, input cond);
        begin
            if (cond) $display("PASS : %0s", name);
            else begin $display("FAIL : %0s", name); errors = errors + 1; end
        end
    endtask

    initial begin
        $dumpfile("vending.vcd");
        $dumpvars(0, tb_vending_machine);

        @(posedge clk); @(posedge clk); #1 rst = 0;

        // ---- Test 1: Buy A (Rs10) with exact Rs10 ----
        press(2'd0);
        check("T1 select A -> WAIT_COIN", state == 3'd1 && price == 8'd10);
        insert(2'b10);
        check("T1 dispense A", dispense == 1 && item == 2'd0);
        @(posedge clk); #1;
        check("T1 no change", change == 8'd0);
        @(posedge clk); #1;
        check("T1 back to IDLE", state == 3'd0);

        // ---- Test 2: Buy B (Rs15) with 10 + 10 -> change Rs5 ----
        press(2'd1);
        insert(2'b10);
        check("T2 amount = 10", amount == 8'd10 && state == 3'd1);
        insert(2'b10);
        check("T2 dispense B", dispense == 1 && item == 2'd1);
        @(posedge clk); #1;
        check("T2 change = 5", change == 8'd5);
        @(posedge clk); #1;

        // ---- Test 3: Select D, insert Rs5, cancel -> refund Rs5 ----
        press(2'd3);
        insert(2'b01);
        press_cancel;
        check("T3 refund = 5", refund == 8'd5 && state == 3'd4);
        @(posedge clk); #1;
        check("T3 back to IDLE, no sale", state == 3'd0 && total_sales == 16'd25);

        // ---- Test 4: Buy D (Rs25) with 20 + 20 -> change Rs15 ----
        press(2'd3);
        insert(2'b11);
        insert(2'b11);
        @(posedge clk); #1;
        check("T4 change = 15", change == 8'd15);
        @(posedge clk); #1;

        // ---- Test 5: Buy A two more times -> stock A becomes 0 ----
        press(2'd0); insert(2'b10); @(posedge clk); @(posedge clk); #1;
        press(2'd0); insert(2'b10); @(posedge clk); @(posedge clk); #1;
        check("T5 stock A = 0", stock_a == 2'd0);

        // ---- Test 6: Select A again -> SOLD OUT, stays IDLE ----
        press(2'd0);
        check("T6 sold out", sold_out == 1 && state == 3'd0);

        // ---- Test 7: Total sales = 10 + 15 + 25 + 10 + 10 = 70 ----
        check("T7 total sales = 70", total_sales == 16'd70);

        if (errors == 0) $display("\n*** ALL TESTS PASSED ***");
        else             $display("\n*** %0d TEST(S) FAILED ***", errors);
        $finish;
    end

endmodule
