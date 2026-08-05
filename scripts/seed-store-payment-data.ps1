param([string]$BaseUrl='http://localhost:4011/api/v1')
$ErrorActionPreference='Stop'

function Invoke-AppApi {
  param([string]$Method='GET',[string]$Path,[object]$Body=$null)
  $params=@{Method=$Method;Uri="$BaseUrl$Path";Headers=$script:Headers}
  if($null-ne$Body){$params.ContentType='application/json';$params.Body=($Body|ConvertTo-Json -Depth 12)}
  Invoke-RestMethod @params
}

$login=Invoke-RestMethod -Method POST -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body (@{login='admin';password='Admin@123'}|ConvertTo-Json)
$script:Headers=@{Authorization="Bearer $($login.data.token)"}
$financialYears=(Invoke-AppApi -Path '/financial-years').data
$fy=@($financialYears|Where-Object{$_.is_current})[0];if(!$fy){$fy=$financialYears[0]}
$vendors=(Invoke-AppApi -Path '/masters/vendors/options').data|Select-Object -First 10
$products=(Invoke-AppApi -Path '/masters/products/options').data|Select-Object -First 10
if($vendors.Count-lt10-or$products.Count-lt10){throw 'At least 10 vendors and 10 products are required before Store seeding'}

# Maintain a useful WITH GST / WITHOUT GST mix through the Vendor Master application API.
for($i=0;$i-lt10;$i++){
  $vendor=$vendors[$i];$gstType=if($i%2-eq0){'WITH_GST'}else{'WITHOUT_GST'}
  if($vendor.gst_type-ne$gstType){
    $body=@{code=$vendor.code;name=$vendor.name;contact_person=$vendor.contact_person;mobile=$vendor.mobile;alternate_mobile=$vendor.alternate_mobile;email=$vendor.email;gstin=$vendor.gstin;gst_type=$gstType;pan=$vendor.pan;address_line1=$vendor.address_line1;address_line2=$vendor.address_line2;city=$vendor.city;state=$vendor.state;pincode=$vendor.pincode;payment_terms=$vendor.payment_terms;bank_name=$vendor.bank_name;account_number=$vendor.account_number;ifsc_code=$vendor.ifsc_code;remarks=$vendor.remarks;status=$vendor.status}
    Invoke-AppApi -Method PUT -Path "/masters/vendors/$($vendor.id)" -Body $body|Out-Null
    $vendor.gst_type=$gstType
  }
}

$stores=@()
for($i=0;$i-lt10;$i++){
  $billNo="ATS-BILL-$('{0:D3}'-f($i+1))"
  $existing=@((Invoke-AppApi -Path "/stores?financial_year_id=$($fy.id)&page=1&search=$billNo").data|Where-Object{$_.bill_no-eq$billNo})[0]
  if(!$existing){
    $vendor=$vendors[$i];$p1=$products[$i];$p2=$products[($i+1)%10];$withGst=$vendor.gst_type-eq'WITH_GST'
    $created=(Invoke-AppApi -Method POST -Path '/stores' -Body @{financial_year_id=$fy.id;store_type='CREDIT';bill_no=$billNo;entry_date=(Get-Date).AddDays(-($i+1)).ToString('yyyy-MM-dd');vendor_id=$vendor.id;details=@(
      @{product_id=$p1.id;product_code=$p1.code;product_name=$p1.name;part_number=$p1.part_number;hsn_code=$p1.hsn_code;quantity=1+($i%3);rate=[decimal]$p1.default_rate;gst_percent=if($withGst){18}else{0};discount_percent=if($i%3-eq0){5}else{2}},
      @{product_id=$p2.id;product_code=$p2.code;product_name=$p2.name;part_number=$p2.part_number;hsn_code=$p2.hsn_code;quantity=2;rate=[decimal]$p2.default_rate;gst_percent=if($withGst){12}else{0};discount_percent=0}
    )}).data
    $existing=(Invoke-AppApi -Path "/stores/$($created.id)").data
  }else{$existing=(Invoke-AppApi -Path "/stores/$($existing.id)").data}
  $stores+=$existing
}

for($i=0;$i-lt10;$i++){
  $store=$stores[$i]
  if([decimal]$store.paid_amount-eq0){
    $amount=[math]::Round([decimal]$store.net_amount*(0.30+(($i%3)*0.10)),2)
    Invoke-AppApi -Method POST -Path '/vendor-payments' -Body @{financial_year_id=$fy.id;payment_date=(Get-Date).AddDays(-$i).ToString('yyyy-MM-dd');vendor_id=$store.vendor_id;remarks="Seed payment against $($store.store_no)";allocations=@(@{store_entry_id=$store.id;amount=$amount})}|Out-Null
  }
}

$storeTotal=(Invoke-AppApi -Path "/stores?financial_year_id=$($fy.id)&page=1&search=ATS-BILL-").meta.total
$paymentTotal=@((Invoke-AppApi -Path "/vendor-payments?financial_year_id=$($fy.id)&search=").data|Where-Object{$_.payment_no-like'VP/*'}).Count
$outstanding=(Invoke-AppApi -Path "/reports/vendor-outstanding?financial_year_id=$($fy.id)&from=$($fy.start_date)&to=$($fy.end_date)")
[pscustomobject]@{financial_year=$fy.name;store_entries=$storeTotal;vendor_payments=$paymentTotal;outstanding_vendor_rows=$outstanding.data.Count;outstanding_amount=$outstanding.summary.outstanding_amount}|Format-List
