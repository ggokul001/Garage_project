param([string]$BaseUrl = 'http://localhost:4011/api/v1')
$ErrorActionPreference = 'Stop'

function Invoke-AppApi {
  param([string]$Method='GET',[string]$Path,[object]$Body=$null)
  $params=@{Method=$Method;Uri="$BaseUrl$Path";Headers=$script:Headers}
  if($null-ne$Body){$params.ContentType='application/json';$params.Body=($Body|ConvertTo-Json -Depth 12)}
  Invoke-RestMethod @params
}
function Ensure-Master {
  param([string]$Slug,[string]$Key,[string]$Value,[hashtable]$Data)
  $result=Invoke-AppApi -Path "/masters/${Slug}?page=1&pageSize=100&search=$([uri]::EscapeDataString($Value))"
  $found=@($result.data|Where-Object{[string]($_.$Key)-eq$Value})[0]
  if($found){return $found}
  (Invoke-AppApi -Method POST -Path "/masters/$Slug" -Body $Data).data
}

$login=Invoke-RestMethod -Method POST -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body (@{login='admin';password='Admin@123'}|ConvertTo-Json)
$script:Token=$login.data.token
$script:Headers=@{Authorization="Bearer $script:Token"}

$companyDefs=@(
  @('COM-001','Accura Trucking Services'),@('COM-002','Accura Service Operations'),@('COM-003','Accura Fleet Support'),@('COM-004','Accura Highway Assistance'),@('COM-005','Accura Commercial Vehicles'),
  @('COM-006','Accura Workshop Solutions'),@('COM-007','Accura Parts & Service'),@('COM-008','Accura Mobility Care'),@('COM-009','Accura Transport Support'),@('COM-010','Accura Vehicle Care')
)
$companies=@();foreach($d in $companyDefs){$companies+=Ensure-Master companies code $d[0] @{code=$d[0];name=$d[1];legal_name=$d[1];phone="93840601$('{0:D2}'-f([array]::IndexOf($companyDefs,$d)+1))";email="$($d[0].ToLower())@accura.local";city='Chennai';state='Tamil Nadu';pincode='602105';status='active'}}
$primaryCompany=$companies[0]

$branchDefs=@(
  @('BR-001','Head Office','Sriperumbudur'),@('BR-002','Oragadam Service Centre','Oragadam'),@('BR-003','Tambaram Service Centre','Tambaram'),@('BR-004','Guindy Service Centre','Guindy'),@('BR-005','Ambattur Service Centre','Ambattur'),
  @('BR-006','Poonamallee Service Centre','Poonamallee'),@('BR-007','Chengalpattu Service Centre','Chengalpattu'),@('BR-008','Kanchipuram Service Centre','Kanchipuram'),@('BR-009','Chennai Port Support','Chennai'),@('BR-010','Red Hills Service Centre','Red Hills')
)
$branches=@();foreach($d in $branchDefs){$branches+=Ensure-Master branches code $d[0] @{company_id=$primaryCompany.id;code=$d[0];name=$d[1];is_head_office=($d[0]-eq'BR-001');phone="90010000$('{0:D2}'-f([array]::IndexOf($branchDefs,$d)+1))";email="$($d[0].ToLower())@accura.local";address_line1='Accura Service Road';city=$d[2];state='Tamil Nadu';pincode='600001';status='active'}}

$departmentNames=@('Operations','Service','Workshop','Spares','Accounts','Customer Support','Quality Control','Human Resources','Administration','Roadside Assistance')
$departments=@();for($i=0;$i-lt10;$i++){$code="DEP-$('{0:D3}'-f($i+1))";$departments+=Ensure-Master departments code $code @{company_id=$primaryCompany.id;code=$code;name=$departmentNames[$i];description="$($departmentNames[$i]) department";status='active'}}
$designationNames=@('Manager','Service Advisor','Floor Supervisor','Mechanic','Senior Mechanic','Auto Electrician','Store Keeper','Accountant','Driver','Customer Care Executive')
$designations=@();for($i=0;$i-lt10;$i++){$code="DES-$('{0:D3}'-f($i+1))";$designations+=Ensure-Master designations code $code @{code=$code;name=$designationNames[$i];description=$designationNames[$i];status='active'}}

$employeeNames=@(@('Arun','Kumar'),@('Bala','Murugan'),@('Charles','Raj'),@('Dinesh','Kannan'),@('Elango','Mani'),@('Farooq','Ahmed'),@('Ganesh','Prabhu'),@('Hari','Krishnan'),@('Imran','Khan'),@('Jeeva','Ravi'))
$employees=@();for($i=0;$i-lt10;$i++){$code="EMP-$('{0:D3}'-f($i+1))";$employees+=Ensure-Master employees code $code @{branch_id=$branches[$i].id;department_id=$departments[$i].id;designation_id=$designations[$i].id;code=$code;first_name=$employeeNames[$i][0];last_name=$employeeNames[$i][1];gender='male';date_of_joining="2024-$('{0:D2}'-f(($i%9)+1))-01";mobile="91000000$('{0:D2}'-f($i+1))";email="employee$($i+1)@accura.local";city=$branchDefs[$i][2];state='Tamil Nadu';pincode='600001';emergency_contact_name='Family Contact';emergency_contact_phone="92000000$('{0:D2}'-f($i+1))";status='active'}}

$customerNames=@('Sri Balaji Transports','Venkateswara Logistics','Kaveri Roadways','Southern Cargo Movers','Chennai Heavy Carriers','Greenline Transport','National Freight Links','Murugan Lorry Service','SKM Logistics','Royal Cargo Services')
$customers=@();for($i=0;$i-lt10;$i++){$code="CUS-$('{0:D3}'-f($i+1))";$customers+=Ensure-Master customers code $code @{code=$code;name=$customerNames[$i];contact_person="Customer Contact $($i+1)";mobile="93000000$('{0:D2}'-f($i+1))";email="customer$($i+1)@example.com";gstin="33ABCDE$('{0:D4}'-f($i+1))F1Z5";pan="ABCDE$('{0:D4}'-f($i+1))F";address_line1="No. $($i+1), Transport Nagar";city='Chennai';state='Tamil Nadu';pincode='600001';credit_limit=100000;credit_days=30;remarks='Regular service customer';status='active'}}

$vendorNames=@('TVS Auto Parts','Sundaram Spares','Bosch Service Supplies','Mann Filters India','Exide Battery House','MRF Tyre Centre','Castrol Lubricants','Lucas Electricals','Fleetguard Filters','Genuine Truck Parts')
$vendors=@();for($i=0;$i-lt10;$i++){$code="VEN-$('{0:D3}'-f($i+1))";$vendors+=Ensure-Master vendors code $code @{code=$code;name=$vendorNames[$i];contact_person="Vendor Contact $($i+1)";mobile="94000000$('{0:D2}'-f($i+1))";email="vendor$($i+1)@example.com";gstin="33FGHIJ$('{0:D4}'-f($i+1))K1Z5";pan="FGHIJ$('{0:D4}'-f($i+1))K";address_line1="Plot $($i+1), Industrial Estate";city='Chennai';state='Tamil Nadu';pincode='600058';payment_terms='30 Days';bank_name='State Bank of India';account_number="100000000$($i+1)";ifsc_code='SBIN0001234';remarks='Approved service vendor';status='active'}}

$uomDefs=@(@('NOS','Numbers'),@('KG','Kilogram'),@('LTR','Litre'),@('MTR','Metre'),@('SET','Set'),@('PAIR','Pair'),@('BOX','Box'),@('PKT','Packet'),@('ROLL','Roll'),@('UNIT','Unit'))
$uoms=@();foreach($d in $uomDefs){$uoms+=Ensure-Master uoms code $d[0] @{code=$d[0];name=$d[1];description="Measured in $($d[1])";status='active'}}
$productDefs=@(
  @('SP-001','Engine Oil Filter','OF-101','84212300',650),@('SP-002','Diesel Fuel Filter','FF-202','84212300',850),@('SP-003','Air Filter Element','AF-303','84213100',1200),@('SP-004','Brake Lining Set','BL-404','87083000',4500),@('SP-005','Clutch Plate','CP-505','87089300',6200),
  @('SP-006','Fan Belt','FB-606','40103900',950),@('SP-007','Head Lamp Bulb','HB-707','85392120',450),@('SP-008','Coolant 5L','CL-808','38200000',1100),@('SP-009','Gear Oil 5L','GO-909','27101980',1450),@('SP-010','Wheel Bearing','WB-010','84822090',2800)
)
$products=@();for($i=0;$i-lt10;$i++){$d=$productDefs[$i];$products+=Ensure-Master products code $d[0] @{code=$d[0];name=$d[1];part_number=$d[2];hsn_code=$d[3];uom_id=$uoms[0].id;default_rate=$d[4];status='active'}}

$pendingDefs=@(@('WAIT_CUSTOMER_APPROVAL','WAIT FOR CUSTOMER APPROVAL'),@('PARTS_UNAVAILABLE','PARTS WAITING / UNAVAILABLE'),@('WAIT_TECH_SUPPORT','WAITING FOR TECHNICAL SUPPORT'),@('WAIT_ROAD_TEST','WAITING FOR ROAD TEST'),@('WAIT_DIAGNOSIS','DIAGNOSIS IN PROGRESS'),@('WAIT_OUTSIDE_SERVICE','OUTSIDE SERVICE PENDING'),@('WAIT_WARRANTY','WARRANTY CONFIRMATION PENDING'),@('WAIT_INSPECTION','FINAL INSPECTION PENDING'),@('WAIT_PAYMENT','CUSTOMER PAYMENT PENDING'),@('WAIT_DELIVERY','VEHICLE DELIVERY PENDING'))
$pendingStatuses=@();foreach($d in $pendingDefs){$pendingStatuses+=Ensure-Master work-pending-sub-statuses code $d[0] @{code=$d[0];name=$d[1];description=$d[1];status='active'}}

$vehicles=@();for($i=0;$i-lt10;$i++){$number="TN$('{0:D2}'-f($i+1))AB$('{0:D4}'-f(1101+$i))";$vehicles+=Ensure-Master vehicles vehicle_number $number @{vehicle_number=$number;customer_id=$customers[$i].id;model=@('Tata 407','Tata 709','Tata 1109','Tata 1512','Tata 1612','Tata 1918','Tata 2518','Tata 2818','Tata 3118','Tata Ultra')[$i];chassis_number="MATACCURA$('{0:D6}'-f($i+1))";sale_date="2023-$('{0:D2}'-f(($i%9)+1))-15";status='active'}}

for($year=2017;$year-le2025;$year++){$code="$year-$(([string]($year+1)).Substring(2,2))";Ensure-Master financial-years code $code @{code=$code;name=$code;start_date="$year-04-01";end_date="$($year+1)-03-31";is_current=$false;status='active'}|Out-Null}
$financialYears=(Invoke-AppApi -Path '/financial-years').data;$currentFy=@($financialYears|Where-Object{$_.is_current})[0];if(!$currentFy){$currentFy=$financialYears[0]}

$permissions=(Invoke-AppApi -Path '/permissions').data
$roleDefs=@(
  @('Supervisor',@('DASHBOARD_VIEW','JOB_CARD_VIEW','JOB_CARD_CREATE','JOB_CARD_UPDATE','JOB_CARD_DELETE','JOB_CARD_APPROVE','JOB_CARD_PRINT','CUSTOMER_VIEW','VEHICLE_VIEW')),
  @('Floor Supervisor',@('DASHBOARD_VIEW','WORK_ORDER_VIEW','WORK_ORDER_UPDATE','WORK_ORDER_APPROVE','WORK_ORDER_PRINT','EMPLOYEE_VIEW','PRODUCT_VIEW','UOM_VIEW','PENDING_STATUS_VIEW')),
  @('Service Advisor',@('DASHBOARD_VIEW','JOB_CARD_VIEW','JOB_CARD_CREATE','JOB_CARD_UPDATE','JOB_CARD_PRINT','CUSTOMER_VIEW','VEHICLE_VIEW')),
  @('Mechanic User',@('DASHBOARD_VIEW','WORK_ORDER_VIEW','WORK_ORDER_UPDATE')),
  @('Accounts User',@('DASHBOARD_VIEW','ACCOUNTS_VIEW','PAYMENT_RECEIVE')),
  @('Stores User',@('DASHBOARD_VIEW','PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_UPDATE','UOM_VIEW','VENDOR_VIEW')),
  @('Customer Support User',@('DASHBOARD_VIEW','CUSTOMER_VIEW','CUSTOMER_CREATE','CUSTOMER_UPDATE','JOB_CARD_VIEW')),
  @('Management Viewer',@('DASHBOARD_VIEW','JOB_CARD_VIEW','WORK_ORDER_VIEW','ACCOUNTS_VIEW'))
)
$roles=@((Invoke-AppApi -Path '/roles').data);foreach($definition in $roleDefs){if(!(@($roles|Where-Object{$_.name-eq$definition[0]})[0])){$ids=@($permissions|Where-Object{$definition[1]-contains$_.code}|ForEach-Object{$_.id});Invoke-AppApi -Method POST -Path '/roles' -Body @{name=$definition[0];description="$($definition[0]) application access";status='active';permission_ids=$ids}|Out-Null;$roles=@((Invoke-AppApi -Path '/roles').data)}}
$roles=@((Invoke-AppApi -Path '/roles').data)
$userDefs=@('supervisor','floor.supervisor','service.advisor','mechanic.user','accounts.user','stores.user','customer.support','management.viewer','service.admin')
$roleNames=@('Supervisor','Floor Supervisor','Service Advisor','Mechanic User','Accounts User','Stores User','Customer Support User','Management Viewer','Standard User')
for($i=0;$i-lt9;$i++){$existing=(Invoke-AppApi -Path "/users?page=1&search=$($userDefs[$i])").data|Where-Object{$_.username-eq$userDefs[$i]};if(!$existing){$role=@($roles|Where-Object{$_.name-eq$roleNames[$i]})[0];Invoke-AppApi -Method POST -Path '/users' -Body @{username=$userDefs[$i];email="$($userDefs[$i])@accura.local";full_name=($userDefs[$i]-replace'\.',' ').ToUpper();password='Seed@123';role_id=$role.id;branch_id=$branches[$i].id;status='active'}|Out-Null}}

$jobCards=@();for($i=0;$i-lt10;$i++){$vehicle=$vehicles[$i];$existing=(Invoke-AppApi -Path "/job-cards?financial_year_id=$($currentFy.id)&page=1&search=$($vehicle.vehicle_number)").data|Select-Object -First 1;if(!$existing){$cost1=1200+($i*100);$cost2=800+($i*75);$estimate=$cost1+$cost2+500;$job=(Invoke-AppApi -Method POST -Path '/job-cards' -Body @{financial_year_id=$currentFy.id;branch_id=$branches[$i].id;entry_date=(Get-Date).AddDays(-$i).ToString('yyyy-MM-dd');vehicle_id=$vehicle.id;vehicle_number=$vehicle.vehicle_number;vehicle_model=$vehicle.model;vehicle_chassis=$vehicle.chassis_number;customer_id=$customers[$i].id;customer_name=$customers[$i].name;customer_contact=$customers[$i].mobile;driver_contact="95000000$('{0:D2}'-f($i+1))";current_kms=50000+($i*5000);current_hours=3000+($i*250);average_daily_kms=180+($i*5);next_service_kms=55000+($i*5000);average_daily_hours=8;next_service_hours=3250+($i*250);estimate_amount=$estimate;advance_paid=if($i%3-eq0){500}else{0};complaints=@(@{complaint=@('Engine oil leakage','Brake noise','Clutch hard','Low pickup','Electrical warning','Coolant leakage','Steering play','Gear shifting issue','Suspension noise','Starting trouble')[$i];cost=$cost1},@{complaint='General service and inspection';cost=$cost2})}).data;$existing=(Invoke-AppApi -Path "/job-cards/$($job.id)").data};if($existing.status-eq'draft'){Invoke-AppApi -Method POST -Path "/job-cards/$($existing.id)/approve"|Out-Null;$existing=(Invoke-AppApi -Path "/job-cards/$($existing.id)").data};$jobCards+=$existing}

for($i=0;$i-lt10;$i++){
  $job=$jobCards[$i]
  $wo=(Invoke-AppApi -Path "/work-orders/$($job.work_order_id)").data
  if($wo.approval_status-ne'approved'){
    $complaintUpdates=@()
    for($j=0;$j-lt$wo.complaints.Count;$j++){
      $completed=(($i+$j)%3-ne0)
      $complaintUpdates+=@{id=$wo.complaints[$j].id;mechanic_employee_id=$employees[($i+$j)%$employees.Count].id;status=if($completed){'completed'}else{'pending'};pending_sub_status_id=if($completed){$null}else{$pendingStatuses[($i+$j)%$pendingStatuses.Count].id}}
    }
    $product=$products[$i]
    $existingSpare=@($wo.spares)[0]
    $spare=@{product_id=$product.id;uom_id=$product.uom_id;product_code=$product.code;product_name=$product.name;part_number=$product.part_number;hsn_code=$product.hsn_code;uom_code=$product.uom_code;quantity=1+($i%3);rate=[decimal]$product.default_rate}
    if($existingSpare){$spare.id=$existingSpare.id}
    Invoke-AppApi -Method PUT -Path "/work-orders/$($wo.id)" -Body @{work_order_type=@('AMC','WARRANTY','PAID')[$i%3];complaints=$complaintUpdates;spares=@($spare)}|Out-Null
    $wo=(Invoke-AppApi -Path "/work-orders/$($wo.id)").data
    if($wo.attachments.Count-eq0){$upload=& curl.exe -s -X POST -H "Authorization: Bearer $script:Token" -F "files=@$PSScriptRoot\..\backend\seed-service-document.pdf;type=application/pdf" "$BaseUrl/work-orders/$($wo.id)/attachments"}
    Invoke-AppApi -Method POST -Path "/work-orders/$($wo.id)/approve"|Out-Null
  }
  $receipts=(Invoke-AppApi -Path "/accounts/$($job.id)/receipts").data
  if($receipts.Count-eq0){
    $balance=[decimal]$job.balance
    $amount=if($i%3-eq0){$balance}else{[math]::Round($balance*0.4,2)}
    if($amount-gt0){Invoke-AppApi -Method POST -Path "/accounts/$($job.id)/receipts" -Body @{receipt_date=(Get-Date).AddDays(-$i).ToString('yyyy-MM-dd');amount=$amount;payment_mode=@('CASH','UPI','CARD','BANK_TRANSFER','OTHER')[$i%5];reference_number="PAY-REF-$('{0:D3}'-f($i+1))";remarks='Application seeded service payment'}|Out-Null}
  }
}

$tickets=(Invoke-AppApi -Path '/help-desk').data;for($i=1;$i-le10;$i++){$subject="Seed Support Request $i";if(!($tickets|Where-Object{$_.subject-eq$subject})){Invoke-AppApi -Method POST -Path '/help-desk' -Body @{subject=$subject;category=@('technical','data','access','training','other')[($i-1)%5];priority=@('low','medium','high','critical')[($i-1)%4];description="Sample support request $i created through the Accura application API for workflow training."}|Out-Null}}

$summary=[ordered]@{}
foreach($slug in @('companies','branches','departments','designations','employees','customers','vendors','vehicles','uoms','products','work-pending-sub-statuses','financial-years')){$summary[$slug]=(Invoke-AppApi -Path "/masters/${slug}?page=1&pageSize=100").meta.total}
$summary['roles']=(Invoke-AppApi -Path '/roles').data.Count;$summary['users']=(Invoke-AppApi -Path '/users?page=1&search=').meta.total;$summary['job-cards']=(Invoke-AppApi -Path "/job-cards?financial_year_id=$($currentFy.id)&page=1").meta.total;$summary['work-orders']=(Invoke-AppApi -Path "/work-orders?financial_year_id=$($currentFy.id)&page=1").meta.total;$summary['accounts']=(Invoke-AppApi -Path "/accounts?financial_year_id=$($currentFy.id)&page=1").meta.total;$summary['help-desk']=(Invoke-AppApi -Path '/help-desk').data.Count
$attachmentCount=0;$receiptCount=0
foreach($job in $jobCards){
  $verifiedWorkOrder=(Invoke-AppApi -Path "/work-orders/$($job.work_order_id)").data
  $attachmentCount+=@($verifiedWorkOrder.attachments).Count
  $receiptCount+=@((Invoke-AppApi -Path "/accounts/$($job.id)/receipts").data).Count
}
$summary['work-order-attachments']=$attachmentCount;$summary['payment-receipts']=$receiptCount
[pscustomobject]$summary|Format-List
