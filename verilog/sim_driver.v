// ============================================================
//  Simulation driver used by the web app (server/index.js)
//  Reads inputs from a text file, one line = one clock cycle:
//        sel_valid  sel  coin  cancel
//  and prints the machine outputs after every clock edge.
//
//  Run:  vvp sim.out +IN=inputs.txt +VCD=wave.vcd
// ============================================================
`timescale 1ns/1ps
module sim_driver;

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

    always #5 clk = ~clk;

    reg [1023:0] in_file, vcd_file;
    integer fd, n, cycle;
    integer v_sel_valid, v_sel, v_coin, v_cancel;

    initial begin
        if (!$value$plusargs("IN=%s", in_file))  in_file  = "inputs.txt";
        if (!$value$plusargs("VCD=%s", vcd_file)) vcd_file = "wave.vcd";
        $dumpfile(vcd_file);
        $dumpvars(0, sim_driver);

        fd = $fopen(in_file, "r");
        if (fd == 0) begin $display("ERROR cannot open input file"); $finish; end

        // reset for two clock cycles
        @(posedge clk); @(posedge clk); #1 rst = 0;

        cycle = 0;
        while (!$feof(fd)) begin
            n = $fscanf(fd, "%d %d %d %d\n", v_sel_valid, v_sel, v_coin, v_cancel);
            if (n == 4) begin
                // apply inputs, then let one clock edge happen
                sel_valid = v_sel_valid; sel = v_sel; coin = v_coin; cancel = v_cancel;
                @(posedge clk); #1;
                // one line per cycle, read by the server
                $display("CYCLE %0d %0d %0d %0d %0d | %0d %0d %0d %0d %0d %0d %0d %0d %0d %0d %0d %0d %0d",
                         cycle, sel_valid, sel, coin, cancel,
                         state, amount, price, item, dispense, change, refund,
                         sold_out, total_sales, stock_a, stock_b, stock_c, stock_d);
                cycle = cycle + 1;
            end
        end
        $fclose(fd);
        $finish;
    end

endmodule
